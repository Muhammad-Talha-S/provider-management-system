from django.conf import settings
from django.utils import timezone
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ServiceRequest, ServiceOffer, ServiceOrder
from .serializers import (
    ServiceRequestSerializer,
    ServiceOfferSerializer,
    ServiceOfferCreateSerializer,
    ServiceOfferStatusUpdateSerializer,
    ServiceOfferDecisionSerializer,
    ServiceOrderSerializer,
    ServiceOrderSubstitutionSerializer,
    ServiceOrderExtensionSerializer,
)


def is_service_mgmt(request) -> bool:
    """
    Group 3 auth via API key (machine-to-machine).
    Header: X-API-KEY: <secret>
    """
    key = request.headers.get("X-API-KEY") or request.META.get("HTTP_X_API_KEY")
    return bool(key) and bool(getattr(settings, "SERVICE_MGMT_API_KEY", "")) and key == settings.SERVICE_MGMT_API_KEY


class ServiceRequestListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    queryset = ServiceRequest.objects.all().order_by("-created_at")
    serializer_class = ServiceRequestSerializer


class ServiceRequestDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    queryset = ServiceRequest.objects.all()
    serializer_class = ServiceRequestSerializer
    lookup_field = "id"


class ServiceOfferListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ServiceOffer.objects.filter(provider=self.request.user.provider).order_by("-created_at")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ServiceOfferCreateSerializer
        return ServiceOfferSerializer

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in ["Provider Admin", "Supplier Representative"]:
            raise PermissionDenied("Only Provider Admin or Supplier Representative can create offers.")
        offer = serializer.save()
        if offer.status == "Submitted" and offer.submitted_at is None:
            offer.submitted_at = timezone.now()
            offer.save(update_fields=["submitted_at"])


class ServiceOfferDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ServiceOfferSerializer
    lookup_field = "id"

    def get_queryset(self):
        return ServiceOffer.objects.filter(provider=self.request.user.provider)


class ServiceOfferStatusUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, id: int):
        try:
            offer = ServiceOffer.objects.get(id=id, provider=request.user.provider)
        except ServiceOffer.DoesNotExist:
            raise NotFound("Offer not found.")

        if request.user.role not in ["Provider Admin", "Supplier Representative"]:
            raise PermissionDenied("Not allowed.")

        serializer = ServiceOfferStatusUpdateSerializer(data=request.data, context={"offer": offer})
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["status"]
        offer.status = new_status

        if new_status == "Submitted" and offer.submitted_at is None:
            offer.submitted_at = timezone.now()

        offer.save(update_fields=["status", "submitted_at"])
        return Response(ServiceOfferSerializer(offer).data)


class ServiceOfferDecisionView(APIView):
    """
    Group 3 endpoint: Accept/Reject a SUBMITTED offer.
    Auth: API key only (X-API-KEY header)
    """
    permission_classes = []  # API key only

    def patch(self, request, id: int):
        if not is_service_mgmt(request):
            raise PermissionDenied("Invalid or missing API key.")

        try:
            offer = ServiceOffer.objects.select_related("service_request", "provider", "specialist").get(id=id)
        except ServiceOffer.DoesNotExist:
            raise NotFound("Offer not found.")

        serializer = ServiceOfferDecisionSerializer(data=request.data, context={"offer": offer})
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["status"]
        offer.status = new_status
        offer.save(update_fields=["status"])

        # If accepted -> create service order (idempotent)
        if new_status == "Accepted":
            sr = offer.service_request
            order, created = ServiceOrder.objects.get_or_create(
                service_offer=offer,
                defaults={
                    "service_request": sr,
                    "provider": offer.provider,
                    "specialist": offer.specialist,
                    "title": sr.title,
                    "start_date": sr.start_date,
                    "end_date": sr.end_date,
                    "location": sr.performance_location,
                    "man_days": sr.total_man_days,
                    "status": "Active",
                },
            )
            if created:
                order.add_history("OrderCreated", "Accepted", "Project Manager", {"offerId": offer.id})
                order.save(update_fields=["change_history"])

        return Response(ServiceOfferSerializer(offer).data)


class ServiceOrderListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ServiceOrderSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == "Specialist":
            return ServiceOrder.objects.filter(specialist=user).order_by("-created_at")
        return ServiceOrder.objects.filter(provider=user.provider).order_by("-created_at")


class ServiceOrderDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ServiceOrderSerializer
    lookup_field = "id"

    def get_queryset(self):
        user = self.request.user
        if user.role == "Specialist":
            return ServiceOrder.objects.filter(specialist=user).order_by("-created_at")
        return ServiceOrder.objects.filter(provider=user.provider).order_by("-created_at")


class ServiceOrderSubstitutionView(APIView):
    """
    Process (1): substitution can be initiated by:
    - Supplier Representative (JWT) OR Provider Admin (JWT)
    - Project Manager (Group 3) via API key

    Rule: new specialist must be a Specialist AND must belong to same provider as the order.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, id: int):
        user = request.user

        allowed_staff = user.role in ["Supplier Representative", "Provider Admin"]
        allowed_pm = is_service_mgmt(request)

        if not allowed_staff and not allowed_pm:
            raise PermissionDenied("Not allowed to request substitution.")

        try:
            if allowed_pm:
                order = ServiceOrder.objects.select_related("provider", "specialist").get(id=id)
            else:
                order = ServiceOrder.objects.select_related("provider", "specialist").get(id=id, provider=user.provider)
        except ServiceOrder.DoesNotExist:
            raise NotFound("Service order not found.")

        if order.status != "Active":
            raise PermissionDenied("Only Active orders can be substituted.")

        ser = ServiceOrderSubstitutionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        new_specialist_id = ser.validated_data["newSpecialistId"]
        reason = ser.validated_data.get("reason", "")

        # ✅ Validate new specialist belongs to the SAME provider and is Specialist
        from accounts.models import User as AccountUser

        try:
            new_specialist = AccountUser.objects.get(
                id=new_specialist_id,
                role="Specialist",
                provider=order.provider,
                availability="Available",
            )
        except AccountUser.DoesNotExist:
            raise PermissionDenied("Replacement specialist must be a Specialist from the same provider.")

        old_specialist_id = str(order.specialist_id)

        # No-op check
        if old_specialist_id == new_specialist_id:
            raise PermissionDenied("Replacement specialist must be different from current specialist.")

        order.specialist = new_specialist

        initiated_by = "Project Manager" if allowed_pm else user.role
        order.add_history(
            "Substitution",
            "Applied",
            initiated_by,
            {
                "fromSpecialistId": old_specialist_id,
                "toSpecialistId": new_specialist_id,
                "reason": reason,
            },
        )
        order.save(update_fields=["specialist_id", "change_history"])

        return Response(ServiceOrderSerializer(order).data)


class ServiceOrderExtensionView(APIView):
    """
    Process (2): extension can ONLY be initiated by Project Manager (Group 3) via API key.
    Updates end_date + man_days + records history.
    """
    permission_classes = []  # API key only

    def post(self, request, id: int):
        if not is_service_mgmt(request):
            raise PermissionDenied("Only Project Manager (Group 3) can request extensions.")

        try:
            order = ServiceOrder.objects.get(id=id)
        except ServiceOrder.DoesNotExist:
            raise NotFound("Service order not found.")

        ser = ServiceOrderExtensionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        new_end = ser.validated_data["endDate"]
        new_man_days = ser.validated_data["manDays"]
        reason = ser.validated_data.get("reason", "")

        old_end = order.end_date.isoformat() if order.end_date else None
        old_man = order.man_days

        order.end_date = new_end
        order.man_days = new_man_days

        order.add_history(
            "Extension",
            "Applied",
            "Project Manager",
            {"oldEndDate": old_end, "newEndDate": new_end.isoformat(), "oldManDays": old_man, "newManDays": new_man_days, "reason": reason},
        )
        order.save(update_fields=["end_date", "man_days", "change_history"])

        return Response(ServiceOrderSerializer(order).data)
