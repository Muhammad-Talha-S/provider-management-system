from django.db import transaction

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from providers.models import Provider
from .models import Contract, ContractOffer, ContractAward
from .serializers import (
    ContractSerializer,
    ContractOfferSerializer,
    ContractOfferCreateSerializer,
    Group2AwardContractSerializer,
)
from .permissions import CanViewContracts, CanSubmitContractOffer
from .auth import Group2ApiKeyAuthentication
from activitylog.utils import log_activity



class ContractListView(generics.ListAPIView):
    serializer_class = ContractSerializer
    permission_classes = [IsAuthenticated, CanViewContracts]

    def get_queryset(self):
        user_provider_id = getattr(self.request.user, "provider_id", None)

        open_qs = Contract.objects.filter(status__in=["Published", "In Negotiation"])
        mine_qs = Contract.objects.filter(
            status__in=["Awarded", "Active", "Expired"],
            awarded_provider_id=user_provider_id
        )

        return (open_qs | mine_qs).exclude(status="Draft").distinct().order_by("-published_at", "-created_at")


class ContractDetailView(generics.RetrieveAPIView):
    serializer_class = ContractSerializer
    permission_classes = [IsAuthenticated, CanViewContracts]
    lookup_field = "id"

    def get_queryset(self):
        user_provider_id = getattr(self.request.user, "provider_id", None)

        open_qs = Contract.objects.filter(status__in=["Published", "In Negotiation"])
        mine_qs = Contract.objects.filter(
            status__in=["Awarded", "Active", "Expired"],
            awarded_provider_id=user_provider_id,
        )

        return (open_qs | mine_qs).exclude(status="Draft").distinct()


class ContractOfferListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_contract(self) -> Contract:
        cid = self.kwargs["id"]
        try:
            return Contract.objects.exclude(status="Draft").get(id=cid)
        except Contract.DoesNotExist:
            raise NotFound("Contract not found.")

    def get_queryset(self):
        contract = self.get_contract()
        return ContractOffer.objects.filter(
            contract=contract,
            provider=self.request.user.provider
        ).order_by("-created_at")

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanSubmitContractOffer()]
        return [IsAuthenticated(), CanViewContracts()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ContractOfferCreateSerializer
        return ContractOfferSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["contract"] = self.get_contract()
        return ctx

    def perform_create(self, serializer):
        # create serializer will create and return the offer
        serializer.save()


class Group2ContractAwardView(APIView):
    """
    Group2 awards a contract to ONE provider (API-key secured).
    Transition in one call:
      Published/In Negotiation/Awarded -> Active
    Idempotent:
      - If already awarded to same provider => 200 OK (no change)
      - If already awarded to a different provider => 409 Conflict
    """
    authentication_classes = [Group2ApiKeyAuthentication]
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request, id: str):
        try:
            contract = Contract.objects.select_for_update().get(id=id)
        except Contract.DoesNotExist:
            raise NotFound("Contract not found.")

        ser = Group2AwardContractSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        provider_id = ser.validated_data["providerId"]
        note = ser.validated_data.get("note", "")

        try:
            provider = Provider.objects.get(id=provider_id)
        except Provider.DoesNotExist:
            raise NotFound("Provider not found.")

        # Guardrails
        if contract.status == "Draft":
            return Response({"detail": "Cannot award a Draft contract."}, status=status.HTTP_400_BAD_REQUEST)

        # If already awarded, be strict & safe
        existing_award = getattr(contract, "award", None)
        if existing_award:
            if existing_award.provider_id != provider.id:
                return Response(
                    {
                        "detail": "Contract already awarded to a different provider.",
                        "awardedProviderId": existing_award.provider_id,
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            # Same provider => idempotent OK
            if contract.status != "Active":
                contract.status = "Active"
                contract.awarded_provider = provider
                contract.save(update_fields=["status", "awarded_provider"])

            return Response(ContractSerializer(contract).data, status=status.HTTP_200_OK)

        # Optional: restrict which states can be awarded (recommended for demo clarity)
        if contract.status not in ["Published", "In Negotiation"]:
            return Response(
                {"detail": f"Cannot award contract in status '{contract.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create award record
        award = ContractAward.objects.create(
            contract=contract,
            provider=provider,
            created_by_system=True,
            note=note,
        )

        # Update contract in ONE transition
        contract.awarded_provider = provider
        contract.status = "Active"
        contract.save(update_fields=["awarded_provider", "status"])

        # ✅ SAFE activity log (only the awarded provider will see it)
        log_activity(
            provider_id=provider.id,
            actor_type="GROUP2_SYSTEM",
            actor_user=None,
            event_type="CONTRACT_AWARDED",
            entity_type="Contract",
            entity_id=contract.id,
            message=f"Contract {contract.id} awarded to provider {provider.id}",
            metadata={
                "contractId": contract.id,
                "providerId": provider.id,
                "awardId": award.id,
            },
        )

        return Response(ContractSerializer(contract).data, status=status.HTTP_200_OK)
