from __future__ import annotations

from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError

from procurement.models import ServiceOrder, ServiceOrderChangeRequest
from providers.models import Specialist
from accounts.models import ProviderUser

from procurement.api.permissions import IsProviderAdminOrSupplierRep, IsProviderAdminOnly
from procurement.api.utils import log_action
from .change_serializers import (
    ChangeRequestListSerializer,
    SupplierSubstitutionCreateSerializer,
    PMExtensionCreateSerializer,
    PMSubstitutionCreateSerializer,
    ChangeDecisionSerializer,
)

# -------------------------
# Helpers
# -------------------------
def require_same_provider(user: ProviderUser, order: ServiceOrder):
    if not user.provider_id or order.provider_id != user.provider_id:
        raise PermissionDenied("You can only access service orders of your provider.")


def is_pm_request(request) -> bool:
    """
    PM stub authentication: client must send header X-PM-KEY matching settings.PM_API_KEY
    """
    key = request.headers.get("X-PM-KEY")
    return bool(key and key == getattr(settings, "PM_API_KEY", None))


# -------------------------
# Provider-side endpoints
# -------------------------

class ServiceOrderChangeRequestListView(ListAPIView):
    """
    GET /api/service-orders/<id>/change-requests/
    Supplier Rep + Provider Admin can view change requests for their provider's order.
    """
    permission_classes = [IsAuthenticated, IsProviderAdminOrSupplierRep]
    serializer_class = ChangeRequestListSerializer

    def get_queryset(self):
        user: ProviderUser = self.request.user
        order_id = self.kwargs["order_id"]
        order = get_object_or_404(ServiceOrder, id=order_id)
        require_same_provider(user, order)

        return ServiceOrderChangeRequest.objects.filter(service_order=order).order_by("-created_at")


class SupplierInitiateSubstitutionView(APIView):
    """
    POST /api/service-orders/<id>/change-requests/substitution/
    Supplier Rep initiates substitution (PM must approve later).
    """
    permission_classes = [IsAuthenticated, IsProviderAdminOrSupplierRep]

    @transaction.atomic
    def post(self, request, order_id):
        user: ProviderUser = request.user
        order = get_object_or_404(ServiceOrder, id=order_id)
        require_same_provider(user, order)

        payload_ser = SupplierSubstitutionCreateSerializer(data=request.data)
        payload_ser.is_valid(raise_exception=True)
        data = payload_ser.validated_data

        new_spec = get_object_or_404(Specialist, id=data["new_specialist_id"])
        if new_spec.provider_id != user.provider_id:
            raise PermissionDenied("New specialist must belong to your provider.")

        cr = ServiceOrderChangeRequest.objects.create(
            service_order=order,
            change_type="SUBSTITUTION",
            initiated_by_type="SUPPLIER_REP",
            initiated_by_user=user,
            payload={
                "new_specialist_id": str(new_spec.id),
                "new_specialist_name": new_spec.full_name,
                "reason": data.get("reason") or "",
            },
            status="REQUESTED",  # waiting for PM approval (simulated)
        )

        log_action(
            provider_id=user.provider_id,
            actor_user_id=user.id,
            action="CHANGE_REQUEST_CREATED",
            entity_type="service_order_change_request",
            entity_id=cr.id,
            details={"change_type": "SUBSTITUTION", "service_order_id": str(order.id)},
        )

        return Response(ChangeRequestListSerializer(cr).data, status=status.HTTP_201_CREATED)


class SupplierDecideOnPMChangeRequestView(APIView):
    """
    POST /api/change-requests/<id>/accept/  or /reject/
    Supplier Rep can accept/reject PM-initiated requests (extension or substitution)
    """
    permission_classes = [IsAuthenticated, IsProviderAdminOrSupplierRep]

    def _ensure_supplier_can_decide(self, user: ProviderUser, cr: ServiceOrderChangeRequest):
        order = cr.service_order
        require_same_provider(user, order)

        if cr.status != "REQUESTED":
            raise ValidationError("Change request is not in REQUESTED state.")

        if cr.initiated_by_type != "PROJECT_MANAGER":
            raise PermissionDenied("Supplier can only decide on PM-initiated change requests.")

    @transaction.atomic
    def post(self, request, cr_id, decision):
        user: ProviderUser = request.user
        cr = get_object_or_404(ServiceOrderChangeRequest, id=cr_id)
        self._ensure_supplier_can_decide(user, cr)

        dec_ser = ChangeDecisionSerializer(data=request.data or {})
        dec_ser.is_valid(raise_exception=True)

        if decision == "accept":
            self._apply_change(cr, user)
            cr.status = "APPROVED"
            cr.payload["supplier_note"] = dec_ser.validated_data.get("note") or ""
            cr.save(update_fields=["status", "payload", "updated_at"])

            log_action(
                provider_id=user.provider_id,
                actor_user_id=user.id,
                action="CHANGE_REQUEST_APPROVED",
                entity_type="service_order_change_request",
                entity_id=cr.id,
                details={"service_order_id": str(cr.service_order_id), "change_type": cr.change_type},
            )
            return Response({"detail": "Change request approved and applied."}, status=status.HTTP_200_OK)

        if decision == "reject":
            cr.status = "REJECTED"
            cr.payload["supplier_note"] = dec_ser.validated_data.get("note") or ""
            cr.save(update_fields=["status", "payload", "updated_at"])

            log_action(
                provider_id=user.provider_id,
                actor_user_id=user.id,
                action="CHANGE_REQUEST_REJECTED",
                entity_type="service_order_change_request",
                entity_id=cr.id,
                details={"service_order_id": str(cr.service_order_id), "change_type": cr.change_type},
            )
            return Response({"detail": "Change request rejected."}, status=status.HTTP_200_OK)

        raise ValidationError("Invalid decision. Use accept or reject.")

    def _apply_change(self, cr: ServiceOrderChangeRequest, user: ProviderUser):
        """
        Apply the change to the service order when supplier accepts PM request.
        """
        order = cr.service_order

        if cr.change_type == "EXTENSION":
            # Expected payload: new_end_date, additional_man_days
            new_end = cr.payload.get("new_end_date")
            add_days = cr.payload.get("additional_man_days")
            if not new_end or not add_days:
                raise ValidationError("Invalid extension payload.")

            order.end_date = new_end
            order.man_days = int(order.man_days) + int(add_days)
            order.save(update_fields=["end_date", "man_days", "updated_at"])

            log_action(
                provider_id=user.provider_id,
                actor_user_id=user.id,
                action="SERVICE_ORDER_EXTENDED",
                entity_type="service_order",
                entity_id=order.id,
                details={"new_end_date": new_end, "additional_man_days": add_days},
            )

        elif cr.change_type == "SUBSTITUTION":
            new_spec_id = cr.payload.get("new_specialist_id")
            if not new_spec_id:
                raise ValidationError("Invalid substitution payload.")

            new_spec = get_object_or_404(Specialist, id=new_spec_id)
            if new_spec.provider_id != user.provider_id:
                raise PermissionDenied("Substitution specialist must belong to same provider.")

            order.specialist = new_spec
            order.save(update_fields=["specialist", "updated_at"])

            log_action(
                provider_id=user.provider_id,
                actor_user_id=user.id,
                action="SERVICE_ORDER_SUBSTITUTED",
                entity_type="service_order",
                entity_id=order.id,
                details={"new_specialist_id": str(new_spec.id), "new_specialist_name": new_spec.full_name},
            )

        else:
            raise ValidationError("Unsupported change_type.")


# -------------------------
# PM stub endpoints (testing only)
# -------------------------

class PMCreateExtensionView(APIView):
    """
    POST /api/pm/service-orders/<id>/extensions/
    PM initiates extension (supplier will accept/reject)
    Requires header: X-PM-KEY
    """
    permission_classes = []  # handled manually

    @transaction.atomic
    def post(self, request, order_id):
        if not is_pm_request(request):
            raise PermissionDenied("PM auth failed (missing/invalid X-PM-KEY).")

        order = get_object_or_404(ServiceOrder, id=order_id)

        ser = PMExtensionCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        cr = ServiceOrderChangeRequest.objects.create(
            service_order=order,
            change_type="EXTENSION",
            initiated_by_type="PROJECT_MANAGER",
            initiated_by_external_id=request.headers.get("X-PM-ID", "PM-UNKNOWN"),
            payload={
                "new_end_date": str(data["new_end_date"]),
                "additional_man_days": data["additional_man_days"],
                "reason": data.get("reason") or "",
            },
            status="REQUESTED",
        )

        # log as system/pm (no actor_user)
        log_action(
            provider_id=order.provider_id,
            actor_user_id=None,
            action="CHANGE_REQUEST_CREATED_BY_PM",
            entity_type="service_order_change_request",
            entity_id=cr.id,
            details={"change_type": "EXTENSION", "service_order_id": str(order.id)},
        )

        return Response(ChangeRequestListSerializer(cr).data, status=status.HTTP_201_CREATED)


class PMDecideOnSupplierSubstitutionView(APIView):
    """
    POST /api/pm/change-requests/<id>/<accept|reject>/
    PM approves/rejects supplier-initiated substitution.
    Requires header: X-PM-KEY
    """
    permission_classes = []  # handled manually

    @transaction.atomic
    def post(self, request, cr_id, decision):
        if not is_pm_request(request):
            raise PermissionDenied("PM auth failed (missing/invalid X-PM-KEY).")

        cr = get_object_or_404(ServiceOrderChangeRequest, id=cr_id)

        if cr.status != "REQUESTED":
            raise ValidationError("Change request is not in REQUESTED state.")
        if cr.initiated_by_type != "SUPPLIER_REP":
            raise PermissionDenied("PM endpoint is only for supplier-initiated substitution requests.")
        if cr.change_type != "SUBSTITUTION":
            raise PermissionDenied("This PM endpoint currently supports only SUBSTITUTION.")

        if decision == "reject":
            cr.status = "REJECTED"
            cr.payload["pm_note"] = (request.data or {}).get("note", "")
            cr.save(update_fields=["status", "payload", "updated_at"])
            return Response({"detail": "PM rejected substitution."}, status=status.HTTP_200_OK)

        if decision == "accept":
            # Apply substitution to order
            order = cr.service_order
            new_spec_id = cr.payload.get("new_specialist_id")
            if not new_spec_id:
                raise ValidationError("Invalid substitution payload.")

            new_spec = get_object_or_404(Specialist, id=new_spec_id)
            # PM should allow only same provider swap
            if new_spec.provider_id != order.provider_id:
                raise ValidationError("Substitution specialist must belong to same provider.")

            order.specialist = new_spec
            order.save(update_fields=["specialist", "updated_at"])

            cr.status = "APPROVED"
            cr.payload["pm_note"] = (request.data or {}).get("note", "")
            cr.save(update_fields=["status", "payload", "updated_at"])

            return Response({"detail": "PM approved substitution and it was applied."}, status=status.HTTP_200_OK)

        raise ValidationError("Invalid decision. Use accept or reject.")
