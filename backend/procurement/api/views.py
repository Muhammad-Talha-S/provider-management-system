from __future__ import annotations

from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError

from procurement.models import ServiceRequest, ServiceOffer, ServiceOfferMatchDetail, ServiceOrder, ActivityLog
from accounts.models import ProviderUser, RoleDefinition
from procurement.api.utils import log_action

from .permissions import IsProviderAdminOnly, IsProviderAdminOrSupplierRep, IsProviderAdminOrSupplierRepForWrite
from .serializers import (
    ServiceRequestListSerializer,
    ServiceRequestDetailSerializer,
    ServiceOfferSerializer,
    OfferCreateSerializer,
    OfferPatchSerializer,
    OfferListSerializer,
    ServiceOrderListSerializer,
    ServiceOrderDetailSerializer,
    ActivityLogSerializer,
    compute_total_cost,
    get_job_levels_for_user,
    validate_rate_policy,
)

SYSTEM_ROLE_SPECIALIST = "Specialist"


class ServiceRequestListView(ListAPIView):
    permission_classes = [IsAuthenticated, IsProviderAdminOrSupplierRep]
    serializer_class = ServiceRequestListSerializer

    def get_queryset(self):
        return ServiceRequest.objects.filter(status="PUBLISHED").order_by("-created_at")


class ServiceRequestDetailView(RetrieveAPIView):
    permission_classes = [IsAuthenticated, IsProviderAdminOrSupplierRep]
    serializer_class = ServiceRequestDetailSerializer
    queryset = ServiceRequest.objects.all()


class CreateOfferForServiceRequestView(APIView):
    permission_classes = [IsAuthenticated, IsProviderAdminOrSupplierRepForWrite]

    @transaction.atomic
    def post(self, request, sr_id):
        user: ProviderUser = request.user
        if not user.provider_id:
            raise PermissionDenied("User is not assigned to any provider.")

        sr = get_object_or_404(ServiceRequest, id=sr_id)
        if sr.status != "PUBLISHED":
            raise ValidationError("Cannot submit offer: service request is not PUBLISHED.")
        if not sr.role_definition_id:
            raise ValidationError("Service request has no role_definition; cannot submit offer.")
        if sr.role_definition.role_type != RoleDefinition.RoleType.JOB:
            raise ValidationError("Service request role_definition must be a JOB role.")

        payload = OfferCreateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        specialist_user = get_object_or_404(ProviderUser, id=data["specialist_user_id"])

        # tenant boundary
        if specialist_user.provider_id != user.provider_id:
            raise PermissionDenied("You can only submit offers with employees from your own provider.")
        if not specialist_user.is_active:
            raise ValidationError("Selected employee is inactive. Activate user before using in offers.")
        if not specialist_user.has_system_role(SYSTEM_ROLE_SPECIALIST):
            raise ValidationError("Selected employee must have SYSTEM role 'Specialist'.")

        daily_rate = data["daily_rate_eur"]
        travel = data.get("travel_cost_per_onsite_day_eur") or 0

        exp_level, tech_level = get_job_levels_for_user(sr, specialist_user)
        validate_rate_policy(sr, daily_rate, exp_level, tech_level)

        total_cost = compute_total_cost(sr, daily_rate, travel)

        offer = ServiceOffer.objects.create(
            service_request=sr,
            provider_id=user.provider_id,
            submitted_by_user=user,
            specialist_user=specialist_user,
            daily_rate_eur=daily_rate,
            travel_cost_per_onsite_day_eur=travel,
            total_cost_eur=total_cost,
            contractual_relationship=data["contractual_relationship"],
            subcontractor_company_name=(data.get("subcontractor_company_name") or None),
            status="SUBMITTED",
        )

        offer.match_score = 0
        offer.save(update_fields=["match_score"])

        ServiceOfferMatchDetail.objects.create(
            service_offer=offer,
            details={
                "experience_level_used": exp_level,
                "technology_level_used": tech_level,
                "policy_validated": True,
                "note": "Basic scoring placeholder; requirements matching will be improved later.",
            },
        )

        log_action(
            provider_id=user.provider_id,
            actor_user_id=user.id,
            action="OFFER_SUBMITTED",
            entity_type="service_offer",
            entity_id=offer.id,
            details={
                "service_request_id": str(sr.id),
                "daily_rate_eur": str(offer.daily_rate_eur),
                "total_cost_eur": str(offer.total_cost_eur),
                "specialist_user_id": str(specialist_user.id),
            },
        )

        return Response(ServiceOfferSerializer(offer).data, status=status.HTTP_201_CREATED)


class OfferPatchView(APIView):
    permission_classes = [IsAuthenticated, IsProviderAdminOrSupplierRepForWrite]

    @transaction.atomic
    def patch(self, request, offer_id):
        user: ProviderUser = request.user
        offer = get_object_or_404(ServiceOffer, id=offer_id)

        if not user.provider_id or offer.provider_id != user.provider_id:
            raise PermissionDenied("You can only edit offers of your provider.")

        is_submitter = offer.submitted_by_user_id == user.id
        is_admin = user.has_system_role("Provider Admin")
        if not (is_submitter or is_admin):
            raise PermissionDenied("Only submitter or Provider Admin can edit this offer.")

        if offer.status in {"ACCEPTED", "REJECTED", "EXPIRED", "WITHDRAWN"}:
            raise ValidationError(f"Cannot edit offer in status {offer.status}.")

        payload = OfferPatchSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        if "specialist_user_id" in data:
            specialist_user = get_object_or_404(ProviderUser, id=data["specialist_user_id"])
            if specialist_user.provider_id != user.provider_id:
                raise PermissionDenied("Employee must belong to your provider.")
            if not specialist_user.is_active:
                raise ValidationError("Selected employee is inactive.")
            if not specialist_user.has_system_role(SYSTEM_ROLE_SPECIALIST):
                raise ValidationError("Selected employee must have SYSTEM role 'Specialist'.")
            offer.specialist_user = specialist_user

        if "daily_rate_eur" in data:
            offer.daily_rate_eur = data["daily_rate_eur"]

        if "travel_cost_per_onsite_day_eur" in data:
            offer.travel_cost_per_onsite_day_eur = data["travel_cost_per_onsite_day_eur"]

        if "contractual_relationship" in data:
            offer.contractual_relationship = data["contractual_relationship"]

        if "subcontractor_company_name" in data:
            offer.subcontractor_company_name = data.get("subcontractor_company_name") or None

        sr = offer.service_request
        exp_level, tech_level = get_job_levels_for_user(sr, offer.specialist_user)
        validate_rate_policy(sr, offer.daily_rate_eur, exp_level, tech_level)
        offer.total_cost_eur = compute_total_cost(sr, offer.daily_rate_eur, offer.travel_cost_per_onsite_day_eur)

        offer.save()

        log_action(
            provider_id=user.provider_id,
            actor_user_id=user.id,
            action="OFFER_EDITED",
            entity_type="service_offer",
            entity_id=offer.id,
            details=data,
        )

        if hasattr(offer, "match_detail"):
            offer.match_detail.details.update({
                "experience_level_used": exp_level,
                "technology_level_used": tech_level,
                "policy_validated": True,
                "edited_at": timezone.now().isoformat(),
            })
            offer.match_detail.save(update_fields=["details"])

        return Response(ServiceOfferSerializer(offer).data, status=status.HTTP_200_OK)


class OfferWithdrawView(APIView):
    permission_classes = [IsAuthenticated, IsProviderAdminOrSupplierRepForWrite]

    @transaction.atomic
    def post(self, request, offer_id):
        user: ProviderUser = request.user
        offer = get_object_or_404(ServiceOffer, id=offer_id)

        if not user.provider_id or offer.provider_id != user.provider_id:
            raise PermissionDenied("You can only withdraw offers of your provider.")

        is_submitter = offer.submitted_by_user_id == user.id
        is_admin = user.has_system_role("Provider Admin")
        if not (is_submitter or is_admin):
            raise PermissionDenied("Only submitter or Provider Admin can withdraw this offer.")

        if offer.status in {"ACCEPTED", "REJECTED", "EXPIRED", "WITHDRAWN"}:
            raise ValidationError(f"Cannot withdraw offer in status {offer.status}.")

        offer.status = "WITHDRAWN"
        offer.save(update_fields=["status"])

        log_action(
            provider_id=user.provider_id,
            actor_user_id=user.id,
            action="OFFER_WITHDRAWN",
            entity_type="service_offer",
            entity_id=offer.id,
        )

        return Response({"detail": "Offer withdrawn successfully."}, status=status.HTTP_200_OK)


class OfferListView(ListAPIView):
    permission_classes = [IsAuthenticated, IsProviderAdminOrSupplierRep]
    serializer_class = OfferListSerializer

    def get_queryset(self):
        user: ProviderUser = self.request.user
        if not user.provider_id:
            return ServiceOffer.objects.none()

        qs = ServiceOffer.objects.filter(provider_id=user.provider_id).select_related(
            "service_request", "submitted_by_user", "specialist_user", "provider"
        ).order_by("-created_at")

        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        sr_id = self.request.query_params.get("service_request")
        if sr_id:
            qs = qs.filter(service_request_id=sr_id)

        return qs


class MyOffersForRequestView(ListAPIView):
    permission_classes = [IsAuthenticated, IsProviderAdminOrSupplierRep]
    serializer_class = OfferListSerializer

    def get_queryset(self):
        user: ProviderUser = self.request.user
        if not user.provider_id:
            return ServiceOffer.objects.none()

        sr_id = self.kwargs["sr_id"]
        ServiceRequest.objects.filter(id=sr_id).exists()

        return (
            ServiceOffer.objects.filter(service_request_id=sr_id, provider_id=user.provider_id)
            .select_related("service_request", "submitted_by_user", "specialist_user", "provider")
            .order_by("-created_at")
        )


class ServiceOrderListView(ListAPIView):
    permission_classes = [IsAuthenticated, IsProviderAdminOrSupplierRep]
    serializer_class = ServiceOrderListSerializer

    def get_queryset(self):
        user: ProviderUser = self.request.user
        if not user.provider_id:
            return ServiceOrder.objects.none()
        return ServiceOrder.objects.filter(provider_id=user.provider_id).select_related(
            "service_request", "supplier_representative_user", "specialist_user"
        ).order_by("-created_at")


class ServiceOrderDetailView(RetrieveAPIView):
    permission_classes = [IsAuthenticated, IsProviderAdminOrSupplierRep]
    serializer_class = ServiceOrderDetailSerializer
    queryset = ServiceOrder.objects.select_related(
        "service_request", "supplier_representative_user", "specialist_user"
    )

    def get_object(self):
        obj: ServiceOrder = super().get_object()
        user: ProviderUser = self.request.user
        if not user.provider_id or obj.provider_id != user.provider_id:
            raise PermissionDenied("You can only view service orders of your provider.")
        return obj


class ActivityLogListView(ListAPIView):
    permission_classes = [IsAuthenticated, IsProviderAdminOnly]
    serializer_class = ActivityLogSerializer

    def get_queryset(self):
        user: ProviderUser = self.request.user
        if not user.provider_id:
            return ActivityLog.objects.none()
        return ActivityLog.objects.filter(provider_id=user.provider_id).select_related("provider", "actor_user").order_by("-created_at")
