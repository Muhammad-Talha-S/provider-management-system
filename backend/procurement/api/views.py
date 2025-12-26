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

from procurement.models import ServiceRequest, ServiceOffer, ServiceOfferMatchDetail
from providers.models import Specialist
from accounts.models import ProviderUser

from .permissions import IsProviderAdminOrSupplierRep, IsProviderAdminOrSupplierRepForWrite
from .serializers import (
    ServiceRequestListSerializer,
    ServiceRequestDetailSerializer,
    ServiceOfferSerializer,
    OfferCreateSerializer,
    OfferPatchSerializer,
    compute_total_cost,
    pick_levels_for_policy,
    validate_rate_policy,
)


class ServiceRequestListView(ListAPIView):
    permission_classes = [IsAuthenticated, IsProviderAdminOrSupplierRep]
    serializer_class = ServiceRequestListSerializer

    def get_queryset(self):
        # for now: return PUBLISHED only (later: filter by domain/role/tech/language)
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

        payload = OfferCreateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        specialist = get_object_or_404(Specialist, id=data["specialist_id"])

        # tenant boundary: specialist must belong to user's provider
        if specialist.provider_id != user.provider_id:
            raise PermissionDenied("You can only submit offers with specialists from your own provider.")

        daily_rate = data["daily_rate_eur"]
        travel = data.get("travel_cost_per_onsite_day_eur") or 0

        exp_level, tech_level = pick_levels_for_policy(sr, specialist, data)
        validate_rate_policy(sr, daily_rate, exp_level, tech_level)

        total_cost = compute_total_cost(sr, daily_rate, travel)

        offer = ServiceOffer.objects.create(
            service_request=sr,
            provider_id=user.provider_id,
            submitted_by_user=user,
            specialist=specialist,
            daily_rate_eur=daily_rate,
            travel_cost_per_onsite_day_eur=travel,
            total_cost_eur=total_cost,
            contractual_relationship=data["contractual_relationship"],
            subcontractor_company_name=(data.get("subcontractor_company_name") or None),
            status="SUBMITTED",
        )

        # very simple match score for now (we improve later)
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

        return Response(ServiceOfferSerializer(offer).data, status=status.HTTP_201_CREATED)


class OfferDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, offer_id):
        offer = get_object_or_404(ServiceOffer, id=offer_id)
        return Response(ServiceOfferSerializer(offer).data)


class OfferPatchView(APIView):
    """
    PATCH /api/offers/<id>/
    - allowed: submitter or Provider Admin of same provider
    - disallowed if offer status is ACCEPTED/REJECTED/EXPIRED/WITHDRAWN
    """
    permission_classes = [IsAuthenticated, IsProviderAdminOrSupplierRepForWrite]

    @transaction.atomic
    def patch(self, request, offer_id):
        user: ProviderUser = request.user
        offer = get_object_or_404(ServiceOffer, id=offer_id)

        # tenant boundary
        if not user.provider_id or offer.provider_id != user.provider_id:
            raise PermissionDenied("You can only edit offers of your provider.")

        # who can edit?
        is_submitter = offer.submitted_by_user_id == user.id
        is_admin = user.has_active_role("Provider Admin")
        if not (is_submitter or is_admin):
            raise PermissionDenied("Only submitter or Provider Admin can edit this offer.")

        if offer.status in {"ACCEPTED", "REJECTED", "EXPIRED", "WITHDRAWN"}:
            raise ValidationError(f"Cannot edit offer in status {offer.status}.")

        payload = OfferPatchSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        # optional specialist change
        if "specialist_id" in data:
            specialist = get_object_or_404(Specialist, id=data["specialist_id"])
            if specialist.provider_id != user.provider_id:
                raise PermissionDenied("Specialist must belong to your provider.")
            offer.specialist = specialist

        if "daily_rate_eur" in data:
            offer.daily_rate_eur = data["daily_rate_eur"]

        if "travel_cost_per_onsite_day_eur" in data:
            offer.travel_cost_per_onsite_day_eur = data["travel_cost_per_onsite_day_eur"]

        if "contractual_relationship" in data:
            offer.contractual_relationship = data["contractual_relationship"]

        if "subcontractor_company_name" in data:
            offer.subcontractor_company_name = data.get("subcontractor_company_name") or None

        # re-validate policy + recompute cost if rate/travel/specialist changed
        sr = offer.service_request
        exp_level, tech_level = pick_levels_for_policy(sr, offer.specialist, {})
        validate_rate_policy(sr, offer.daily_rate_eur, exp_level, tech_level)

        offer.total_cost_eur = compute_total_cost(sr, offer.daily_rate_eur, offer.travel_cost_per_onsite_day_eur)

        offer.save()

        # update match detail record (if exists)
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
    """
    POST /api/offers/<id>/withdraw/
    - allowed: submitter or Provider Admin (same provider)
    - sets status WITHDRAWN
    """
    permission_classes = [IsAuthenticated, IsProviderAdminOrSupplierRepForWrite]

    @transaction.atomic
    def post(self, request, offer_id):
        user: ProviderUser = request.user
        offer = get_object_or_404(ServiceOffer, id=offer_id)

        if not user.provider_id or offer.provider_id != user.provider_id:
            raise PermissionDenied("You can only withdraw offers of your provider.")

        is_submitter = offer.submitted_by_user_id == user.id
        is_admin = user.has_active_role("Provider Admin")
        if not (is_submitter or is_admin):
            raise PermissionDenied("Only submitter or Provider Admin can withdraw this offer.")

        if offer.status in {"ACCEPTED", "REJECTED", "EXPIRED", "WITHDRAWN"}:
            raise ValidationError(f"Cannot withdraw offer in status {offer.status}.")

        offer.status = "WITHDRAWN"
        offer.save(update_fields=["status"])

        return Response({"detail": "Offer withdrawn successfully."}, status=status.HTTP_200_OK)
