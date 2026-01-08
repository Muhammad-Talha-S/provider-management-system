from django.utils import timezone
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied, NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from .auth import Group3ApiKeyAuthentication
from .models import ServiceRequest, ServiceOffer, ServiceOrder, ServiceOrderChangeRequest
from .serializers import (
    ServiceRequestSerializer,
    ServiceOfferSerializer,
    ServiceOfferCreateSerializer,
    ServiceOfferStatusUpdateSerializer,
    ServiceOrderSerializer,
    ServiceOrderChangeRequestSerializer,
    ProviderCreateSubstitutionRequestSerializer,
    Group3ExtensionCreateSerializer,
    Group3SubstitutionCreateSerializer,
    ProviderDecisionSerializer,
    Group3OfferDecisionSerializer,
)


# -------------------------
# Service Requests (Provider Portal)
# -------------------------
class ServiceRequestListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    queryset = ServiceRequest.objects.all().order_by("-created_at")
    serializer_class = ServiceRequestSerializer


class ServiceRequestDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    queryset = ServiceRequest.objects.all()
    serializer_class = ServiceRequestSerializer
    lookup_field = "id"


# -------------------------
# Service Offers (Provider Portal)
# -------------------------
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

        serializer = ServiceOfferStatusUpdateSerializer(
            data=request.data,
            context={"offer": offer},
        )
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["status"]
        offer.status = new_status

        if new_status == "Submitted" and offer.submitted_at is None:
            offer.submitted_at = timezone.now()

        offer.save(update_fields=["status", "submitted_at"])
        return Response(ServiceOfferSerializer(offer).data)


# -------------------------
# Service Orders (Provider Portal)
# -------------------------
class ServiceOrderListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ServiceOrderSerializer

    def get_queryset(self):
        user = self.request.user
        qs = ServiceOrder.objects.all().order_by("-created_at")

        if user.role in ["Provider Admin", "Supplier Representative"]:
            return qs.filter(provider=user.provider)

        if user.role == "Specialist":
            return qs.filter(specialist=user)

        raise PermissionDenied("Not allowed.")


class ServiceOrderDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ServiceOrderSerializer
    lookup_field = "id"

    def get_queryset(self):
        user = self.request.user
        qs = ServiceOrder.objects.select_related("provider", "specialist", "service_request", "service_offer")
        if user.role in ["Provider Admin", "Supplier Representative"]:
            return qs.filter(provider=user.provider)
        if user.role == "Specialist":
            return qs.filter(specialist=user)
        raise PermissionDenied("Not allowed.")


class MyOrdersView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ServiceOrderSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role != "Specialist":
            raise PermissionDenied("Only Specialists can access My Orders.")
        return ServiceOrder.objects.filter(specialist=user).order_by("-created_at")


# -------------------------
# Change Requests (Provider Portal)
# -------------------------
class ServiceOrderChangeRequestListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = ServiceOrderChangeRequest.objects.select_related("service_order").order_by("-created_at")

        if user.role in ["Provider Admin", "Supplier Representative"]:
            return qs.filter(provider=user.provider)

        if user.role == "Specialist":
            return qs.filter(service_order__specialist=user)

        raise PermissionDenied("Not allowed.")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ProviderCreateSubstitutionRequestSerializer
        return ServiceOrderChangeRequestSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        cr = serializer.save()
        return Response(ServiceOrderChangeRequestSerializer(cr).data, status=201)


class ServiceOrderChangeRequestDecisionView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, id: int):
        try:
            cr = ServiceOrderChangeRequest.objects.select_related("service_order").get(id=id)
        except ServiceOrderChangeRequest.DoesNotExist:
            raise NotFound("Change request not found.")

        decision_ser = ProviderDecisionSerializer(
            data=request.data,
            context={"change_request": cr, "request": request},
        )
        decision_ser.is_valid(raise_exception=True)

        decision = decision_ser.validated_data["decision"]
        note = decision_ser.validated_data.get("providerResponseNote", "")

        cr.provider_response_note = note
        cr.decided_by_user = request.user
        cr.decided_at = timezone.now()

        if decision == "Decline":
            cr.status = "Declined"
            cr.save(update_fields=["status", "provider_response_note", "decided_by_user", "decided_at"])
            return Response(ServiceOrderChangeRequestSerializer(cr).data)

        cr.status = "Approved"
        order = cr.service_order

        if cr.type == "Extension":
            if cr.new_end_date is not None:
                order.end_date = cr.new_end_date
            if cr.additional_man_days is not None:
                order.man_days = (order.man_days or 0) + cr.additional_man_days
            if cr.new_total_cost is not None:
                order.total_cost = cr.new_total_cost
            order.save(update_fields=["end_date", "man_days", "total_cost"])

        elif cr.type == "Substitution":
            if not cr.new_specialist_id:
                raise PermissionDenied("Invalid substitution request.")
            order.specialist_id = cr.new_specialist_id
            order.save(update_fields=["specialist_id"])

        cr.save(update_fields=["status", "provider_response_note", "decided_by_user", "decided_at"])
        return Response(ServiceOrderChangeRequestSerializer(cr).data)


# -------------------------
# Group 3 (API-Key only) endpoints
# -------------------------
class Group3CreateExtensionView(APIView):
    authentication_classes = [Group3ApiKeyAuthentication]
    permission_classes = [AllowAny]

    def post(self, request, id: int):
        try:
            order = ServiceOrder.objects.select_related("provider").get(id=id)
        except ServiceOrder.DoesNotExist:
            raise NotFound("Service order not found.")

        ser = Group3ExtensionCreateSerializer(data=request.data, context={"order": order})
        ser.is_valid(raise_exception=True)
        cr = ser.save()
        return Response(ServiceOrderChangeRequestSerializer(cr).data, status=201)


class Group3CreateSubstitutionView(APIView):
    authentication_classes = [Group3ApiKeyAuthentication]
    permission_classes = [AllowAny]

    def post(self, request, id: int):
        try:
            order = ServiceOrder.objects.select_related("provider").get(id=id)
        except ServiceOrder.DoesNotExist:
            raise NotFound("Service order not found.")

        ser = Group3SubstitutionCreateSerializer(data=request.data, context={"order": order})
        ser.is_valid(raise_exception=True)
        cr = ser.save()
        return Response(ServiceOrderChangeRequestSerializer(cr).data, status=201)


class Group3OfferDecisionView(APIView):
    """
    Group3 decides offer => Accept/Reject (API-key secured).
    Accept creates ServiceOrder and closes ServiceRequest.
    """
    authentication_classes = [Group3ApiKeyAuthentication]
    permission_classes = [AllowAny]

    def post(self, request, id: int):
        try:
            offer = ServiceOffer.objects.select_related(
                "service_request", "provider", "specialist"
            ).get(id=id)
        except ServiceOffer.DoesNotExist:
            raise NotFound("Service offer not found.")

        ser = Group3OfferDecisionSerializer(data=request.data, context={"offer": offer})
        ser.is_valid(raise_exception=True)
        result = ser.save()

        offer = result["offer"]
        order = result.get("order")

        payload = {
            "offer": ServiceOfferSerializer(offer).data,
            "order": ServiceOrderSerializer(order).data if order else None,
        }
        return Response(payload, status=200)
