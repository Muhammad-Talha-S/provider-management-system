import requests
from django.conf import settings
from django.db import transaction
from django.utils.dateparse import parse_date, parse_datetime

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Contract, ContractOffer, ContractProviderStatus
from .serializers import (
    ContractSerializer,
    ContractOfferSerializer,
    ContractOfferCreateSerializer,
    Group2ProviderStatusSerializer,
)
from .auth import Group2ApiKeyAuthentication
from activitylog.utils import log_activity


def _can_view_contract(user, contract: Contract) -> bool:
    # Draft contracts hidden from providers
    if contract.status == "DRAFT":
        return False
    return True


class ContractListView(generics.ListAPIView):
    serializer_class = ContractSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # All providers see all non-draft contracts (isolation is handled in serializer by not exposing award list)
        return Contract.objects.exclude(status="DRAFT").order_by("-publishing_date", "-created_at")


class ContractDetailView(generics.RetrieveAPIView):
    serializer_class = ContractSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "id"

    def get_queryset(self):
        return Contract.objects.exclude(status="DRAFT")


class ContractOfferListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_contract(self) -> Contract:
        cid = self.kwargs["id"]
        try:
            c = Contract.objects.get(id=cid)
        except Contract.DoesNotExist:
            raise NotFound("Contract not found.")
        if not _can_view_contract(self.request.user, c):
            raise NotFound("Contract not found.")
        return c

    def get_queryset(self):
        contract = self.get_contract()
        return ContractOffer.objects.filter(contract=contract, provider=self.request.user.provider).order_by("-created_at")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ContractOfferCreateSerializer
        return ContractOfferSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["contract"] = self.get_contract()
        return ctx

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in ["Provider Admin", "Contract Coordinator"]:
            raise PermissionDenied("Only Provider Admin or Contract Coordinator can submit contract offers.")
        serializer.save()


class Group2SyncContractsView(APIView):
    """
    Manual pull-sync contracts from Group2.
    Uses settings.GROUP2_CONTRACTS_URL.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role not in ["Provider Admin", "Contract Coordinator"]:
            raise PermissionDenied("Not allowed.")

        url = settings.GROUP2_CONTRACTS_URL
        resp = requests.get(url, timeout=20)
        if resp.status_code >= 400:
            return Response({"detail": f"Group2 returned {resp.status_code}"}, status=502)

        data = resp.json()
        if not isinstance(data, list):
            return Response({"detail": "Invalid payload from Group2 (expected list)."}, status=502)

        upserted = 0
        skipped = 0

        for item in data:
            if not isinstance(item, dict):
                continue

            kind = (item.get("kind") or "").upper()
            if kind == "HARDWARE":
                skipped += 1
                continue

            cid = item.get("contractId") or item.get("id")
            if not cid:
                continue

            publishing_date = parse_date(item.get("publishingDate")) if item.get("publishingDate") else None
            offer_deadline_at = parse_datetime(item.get("offerDeadlineAt")) if item.get("offerDeadlineAt") else None

            c, _created = Contract.objects.update_or_create(
                id=str(cid),
                defaults={
                    "title": item.get("title") or "",
                    "kind": kind or "SERVICE",
                    "status": (item.get("status") or "DRAFT").upper(),
                    "publishing_date": publishing_date,
                    "offer_deadline_at": offer_deadline_at,
                    "stakeholders": item.get("stakeholders"),
                    "scope_of_work": item.get("scopeOfWork") or "",
                    "terms_and_conditions": item.get("termsAndConditions") or "",
                    "weighting": item.get("weighting"),
                    "config": item.get("allowedConfiguration"),
                    "versions_and_documents": item.get("versionsAndDocuments"),
                    "external_snapshot": item,
                },
            )
            upserted += 1

        log_activity(
            provider_id=request.user.provider_id,
            actor_type="USER",
            actor_user=request.user,
            event_type="GROUP2_SYNC_CONTRACTS",
            entity_type="Contract",
            entity_id="*",
            message=f"Synced contracts from Group2: upserted={upserted}, skipped={skipped}",
        )
        return Response({"upserted": upserted, "skipped": skipped})


class Group2SetProviderStatusView(APIView):
    """
    Group2 informs the provider-specific contract status:
      IN_NEGOTIATION | ACTIVE | EXPIRED
    """
    authentication_classes = [Group2ApiKeyAuthentication]
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request, id: str):
        try:
            contract = Contract.objects.select_for_update().get(id=id)
        except Contract.DoesNotExist:
            raise NotFound("Contract not found.")

        ser = Group2ProviderStatusSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        provider_id = ser.validated_data["providerId"]
        status_value = ser.validated_data["status"]
        note = ser.validated_data.get("note") or ""

        cps, _ = ContractProviderStatus.objects.update_or_create(
            contract=contract,
            provider_id=provider_id,
            defaults={"status": status_value, "note": note},
        )

        # Optional: if any provider is ACTIVE, set contract overall to ACTIVE (safe default)
        if status_value == "ACTIVE" and contract.status in ["PUBLISHED", "IN_NEGOTIATION"]:
            contract.status = "ACTIVE"
            contract.save(update_fields=["status"])

        log_activity(
            provider_id=provider_id,
            actor_type="GROUP2_SYSTEM",
            actor_user=None,
            event_type="CONTRACT_PROVIDER_STATUS",
            entity_type="Contract",
            entity_id=contract.id,
            message=f"Group2 set provider status for contract {contract.id}: {provider_id} -> {status_value}",
            metadata={"providerId": provider_id, "status": status_value},
        )

        return Response({"contractId": contract.id, "providerId": provider_id, "status": cps.status})
