import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
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
    if contract.status == "DRAFT":
        return False
    return True


def _group2_offer_url(contract_id: str) -> str:
    tpl = getattr(settings, "GROUP2_CONTRACT_OFFER_URL_TEMPLATE", "") or ""
    if not tpl:
        raise RuntimeError("GROUP2_CONTRACT_OFFER_URL_TEMPLATE is not configured.")
    return tpl.format(contract_id=contract_id)


class ContractListView(generics.ListAPIView):
    serializer_class = ContractSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
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

        contract = self.get_contract()
        status_value = serializer.validated_data.get("status", "SUBMITTED")
        proposed_pricing_rules = serializer.validated_data["proposedPricingRules"]
        note = serializer.validated_data.get("note") or ""

        provider = user.provider

        # Try to derive provider email/name with best-effort
        provider_name = getattr(provider, "name", None) or getattr(provider, "provider_name", None) or str(provider.id)
        provider_email = (
            getattr(provider, "contact_email", None)
            or getattr(provider, "email", None)
            or getattr(provider, "contactEmail", None)
            or getattr(user, "email", None)
            or ""
        )

        outbound_payload = {
            "providerEmail": provider_email,
            "providerName": provider_name,
            "category": "IT Service",
            "proposedPricingRules": proposed_pricing_rules,
        }
        if note:
            outbound_payload["note"] = note

        # If DRAFT: store locally only, do not send to Group2
        if status_value == "DRAFT":
            snapshot = contract.external_snapshot or {}
            ContractOffer.objects.create(
                contract=contract,
                provider=provider,
                created_by_user_id=getattr(user, "id", None),
                request_snapshot=snapshot,
                response={"outbound": outbound_payload, "group2": None},
                deltas=[],
                note=note,
                status="DRAFT",
                submitted_at=None,
            )
            return

        # SUBMITTED: send to Group2 then store locally
        url = _group2_offer_url(contract.id)
        headers = {}
        api_key = getattr(settings, "GROUP2_API_KEY", None)
        if api_key:
            headers["GROUP2-API-KEY"] = api_key

        try:
            resp = requests.post(url, json=outbound_payload, headers=headers, timeout=20)
        except Exception as e:
            raise ValidationError(f"Failed to reach Group2 offer endpoint: {e}")

        if resp.status_code >= 400:
            # Bubble up error cleanly
            detail = None
            try:
                detail = resp.json()
            except Exception:
                detail = {"detail": resp.text[:500] if resp.text else "Unknown error from Group2"}
            raise ValidationError({"detail": "Group2 rejected offer submission.", "group2": detail})

        group2_response = None
        try:
            group2_response = resp.json()
        except Exception:
            group2_response = {"detail": "Group2 returned non-JSON response."}

        snapshot = contract.external_snapshot or {}

        ContractOffer.objects.create(
            contract=contract,
            provider=provider,
            created_by_user_id=getattr(user, "id", None),
            request_snapshot=snapshot,
            response={"outbound": outbound_payload, "group2": group2_response},
            deltas=[],
            note=note,
            status="SUBMITTED",
            submitted_at=timezone.now(),
        )


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
        print(resp.status_code, resp.text)
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

            print("Upserting contract", cid)
            Contract.objects.update_or_create(
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
        print("Synced contracts from Group2: upserted=", upserted, "skipped=", skipped)
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
