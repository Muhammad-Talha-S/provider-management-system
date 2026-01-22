import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied, NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from activitylog.utils import log_activity
from contracts.models import ContractProviderStatus

from accounts.models import User
from .models import ServiceRequest, ServiceOffer, ServiceOrder, ServiceOrderAssignment
from .serializers import (
    ServiceRequestSerializer,
    ServiceOfferSerializer,
    ServiceOfferCreateSerializer,
    ServiceOrderSerializer,
    upsert_group3_service_request,
)


def _assert_can_view_service_requests(user):
    if user.role == "Contract Coordinator":
        raise PermissionDenied("Contract Coordinator cannot access Service Requests.")


class ServiceRequestListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ServiceRequestSerializer

    def get_queryset(self):
        user = self.request.user
        _assert_can_view_service_requests(user)

        active_contract_ids = ContractProviderStatus.objects.filter(
            provider_id=user.provider_id,
            status="ACTIVE",
        ).values_list("contract_id", flat=True)

        return ServiceRequest.objects.filter(contract_id__in=active_contract_ids).order_by("-created_at")


class ServiceRequestDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ServiceRequestSerializer
    lookup_field = "id"

    def get_queryset(self):
        user = self.request.user
        _assert_can_view_service_requests(user)

        active_contract_ids = ContractProviderStatus.objects.filter(
            provider_id=user.provider_id,
            status="ACTIVE",
        ).values_list("contract_id", flat=True)

        return ServiceRequest.objects.filter(contract_id__in=active_contract_ids)


class Group3SyncServiceRequestsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role not in ["Provider Admin", "Supplier Representative"]:
            raise PermissionDenied("Not allowed.")

        url = settings.GROUP3_REQUESTS_URL
        resp = requests.get(url)
        if resp.status_code >= 400:
            return Response({"detail": f"Group3 returned {resp.status_code}"}, status=502)

        data = resp.json()
        if not isinstance(data, list):
            return Response({"detail": "Invalid payload from Group3 (expected list)."}, status=502)

        upserted = 0
        for item in data:
            if not isinstance(item, dict):
                continue
            try:
                upsert_group3_service_request(item)
                upserted += 1
            except Exception:
                continue

        log_activity(
            provider_id=request.user.provider_id,
            actor_type="USER",
            actor_user=request.user,
            event_type="GROUP3_SYNC_SERVICE_REQUESTS",
            entity_type="ServiceRequest",
            entity_id="*",
            message=f"Synced service requests from Group3: upserted={upserted}",
        )

        return Response({"upserted": upserted})


def _group3_offer_put_url(offer_id: int) -> str:
    """
    Group3 expects: PUT https://.../offers/{offerId}
    Set GROUP3_OFFERS_BASE_URL in settings, example:
      GROUP3_OFFERS_BASE_URL = "https://servicemanagementsystem-1-2s7d.onrender.com/offers"
    """
    base = getattr(settings, "GROUP3_OFFERS_BASE_URL", "").rstrip("/")
    if not base:
        raise RuntimeError("GROUP3_OFFERS_BASE_URL is not configured")
    return f"{base}/{offer_id}"


def _map_offer_to_group3_payload(offer: ServiceOffer) -> dict:
    """
    Payload sent to Group3.
    - No deltas
    - specialists[] list
    - one totalCost for entire request
    """
    sr = offer.service_request
    resp = offer.response if isinstance(offer.response, dict) else {}

    # Group3 sample structure includes serviceRequest nested.
    service_request_payload = {
        "id": sr.external_id or 0,
        "requestNumber": sr.request_number or sr.id,
        "title": sr.title,
        "type": sr.type,
        "requestedByUsername": sr.requested_by_username,
        "requestedByRole": sr.requested_by_role,
        "projectId": sr.project_id,
        "projectName": sr.project_name,
        "contractId": sr.contract_id,
        "contractSupplier": sr.contract_supplier,
        "startDate": str(sr.start_date) if sr.start_date else None,
        "endDate": str(sr.end_date) if sr.end_date else None,
        "performanceLocation": sr.performance_location,
        "maxOffers": sr.max_offers or 0,
        "maxAcceptedOffers": sr.max_accepted_offers or 0,
        "requiredLanguages": sr.required_languages or [],
        "mustHaveCriteria": sr.must_have_criteria or [],
        "niceToHaveCriteria": sr.nice_to_have_criteria or [],
        "taskDescription": sr.task_description or "",
        "furtherInformation": sr.further_information or "",
        "status": sr.status,
        "roles": sr.roles or [],
        "biddingCycleDays": sr.bidding_cycle_days or 0,
        "biddingStartAt": sr.bidding_start_at.isoformat() if sr.bidding_start_at else None,
        "biddingEndAt": sr.bidding_end_at.isoformat() if sr.bidding_end_at else None,
        "biddingActive": bool(sr.bidding_active) if sr.bidding_active is not None else None,
    }

    payload = {
        "id": offer.id,
        "serviceRequest": service_request_payload,
        "specialists": resp.get("specialists", []),
        "totalCost": resp.get("totalCost", 0),
        "contractualRelationship": resp.get("contractualRelationship", ""),
        "subcontractorCompany": resp.get("subcontractorCompany", ""),
        "supplierName": resp.get("supplierName", offer.provider.name),
        "supplierRepresentative": resp.get("supplierRepresentative", offer.created_by.name if offer.created_by else ""),
        "offerStatus": offer.status,
        "providerId": offer.provider_id,
        "providerName": offer.provider.name,
    }
    return payload


def _send_offer_to_group3(offer: ServiceOffer) -> None:
    """
    PUT offer to Group3.
    If it fails, raise -> request fails so FE shows error.
    """
    url = _group3_offer_put_url(offer.id)
    payload = _map_offer_to_group3_payload(offer)

    print("Sending offer to Group3:", url, payload)

    '''
    resp = requests.put(url, json=payload, timeout=20)

    offer.group3_last_status = resp.status_code
    try:
        offer.group3_last_response = resp.json()
    except Exception:
        offer.group3_last_response = {"raw": resp.text[:2000]}

    offer.save(update_fields=["group3_last_status", "group3_last_response"])

    if resp.status_code >= 400:
        raise ValueError(f"Group3 PUT failed: status={resp.status_code}")
    '''


class ServiceOfferListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ServiceOffer.objects.filter(provider=self.request.user.provider).order_by("-created_at")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ServiceOfferCreateSerializer
        return ServiceOfferSerializer

    def create(self, request, *args, **kwargs):
        """
        IMPORTANT:
        - Use ServiceOfferCreateSerializer only for INPUT/validation.
        - Return ServiceOfferSerializer for OUTPUT to avoid 500 errors due to mismatch fields.
        """
        user = request.user
        if user.role not in ["Provider Admin", "Supplier Representative"]:
            raise PermissionDenied("Only Provider Admin or Supplier Representative can create offers.")

        input_serializer = ServiceOfferCreateSerializer(data=request.data, context={"request": request})
        input_serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            offer: ServiceOffer = input_serializer.save(created_by=user)

            # If SUBMITTED -> send to Group3 immediately
            if offer.status == "SUBMITTED":
                offer.submitted_at = timezone.now()
                offer.save(update_fields=["submitted_at"])
                _send_offer_to_group3(offer)

        log_activity(
            provider_id=offer.provider_id,
            actor_type="USER",
            actor_user=user,
            event_type="PROC_SERVICE_OFFER_CREATED",
            entity_type="ServiceOffer",
            entity_id=offer.id,
            message=f"Created service offer for request {offer.service_request_id}",
            metadata={"serviceRequestId": offer.service_request_id, "status": offer.status},
        )

        # OUTPUT serializer
        out = ServiceOfferSerializer(offer, context={"request": request})
        return Response(out.data, status=201)


class ServiceOfferDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ServiceOfferSerializer
    lookup_field = "id"

    def get_queryset(self):
        return ServiceOffer.objects.filter(provider=self.request.user.provider)


class Group3OfferDecisionWebhookView(APIView):
    """
    Group3 calls us when it accepts/rejects an offer.
    No API key for now -> AllowAny.
    POST /api/integrations/group3/offers/<offer_id>/decision/
    body:
      {
        "serviceOfferId": 123,
        "decision": "ACCEPTED" | "REJECTED",
        "providerId": "P001",
        "providerName": "RheinTech Solutions GmbH"
      }
    """
    permission_classes = [AllowAny]

    def post(self, request, offer_id: int):
        data = request.data if isinstance(request.data, dict) else {}
        decision = str(data.get("decision") or data.get("status") or "").upper()
        body_offer_id = data.get("serviceOfferId")

        # accept either offer_id in path OR in body, but path is authoritative
        if body_offer_id and int(body_offer_id) != int(offer_id):
            return Response({"detail": "serviceOfferId mismatch with URL."}, status=400)

        if decision not in ["ACCEPTED", "REJECTED"]:
            return Response({"detail": "decision must be ACCEPTED or REJECTED."}, status=400)

        try:
            offer = ServiceOffer.objects.select_related("service_request", "provider").get(id=offer_id)
        except ServiceOffer.DoesNotExist:
            raise NotFound("Offer not found.")

        # idempotency: if already final, just return OK
        if offer.status in ["ACCEPTED", "REJECTED"]:
            return Response({"ok": True, "offerStatus": offer.status})

        with transaction.atomic():
            offer.status = decision
            offer.save(update_fields=["status"])

            if decision == "ACCEPTED":
                # create ServiceOrder (one order per offer)
                sr = offer.service_request
                resp = offer.response if isinstance(offer.response, dict) else {}
                total_cost = resp.get("totalCost", 0) or 0

                order = ServiceOrder.objects.create(
                    service_offer=offer,
                    service_request=sr,
                    provider=offer.provider,
                    title=sr.title or "",
                    start_date=sr.start_date,
                    end_date=sr.end_date,
                    location=sr.performance_location or "Onsite",
                    man_days=0,
                    total_cost=total_cost,
                    status="ACTIVE",
                )

                # link specialists from offer.response.specialists
                specs = resp.get("specialists")
                if isinstance(specs, list):
                    for s in specs:
                        if not isinstance(s, dict):
                            continue
                        uid = str(s.get("userId") or "")
                        if not uid:
                            continue
                        specialist = User.objects.filter(id=uid, role="Specialist").first()
                        if not specialist:
                            continue

                        ServiceOrderAssignment.objects.create(
                            order=order,
                            specialist=specialist,
                            daily_rate=s.get("dailyRate") or 0,
                            travelling_cost=s.get("travellingCost") or 0,
                            specialist_cost=s.get("specialistCost") or 0,
                            match_must_have_criteria=bool(s.get("matchMustHaveCriteria", True)),
                            match_nice_to_have_criteria=bool(s.get("matchNiceToHaveCriteria", True)),
                            match_language_skills=bool(s.get("matchLanguageSkills", True)),
                        )

        log_activity(
            provider_id=offer.provider_id,
            actor_type="SYSTEM",
            actor_user=None,
            event_type="GROUP3_OFFER_DECISION",
            entity_type="ServiceOffer",
            entity_id=str(offer.id),
            message=f"Group3 decision={decision} for offer={offer.id}",
            metadata={"decision": decision, "providerId": data.get("providerId"), "providerName": data.get("providerName")},
        )

        return Response({"ok": True, "offerStatus": offer.status})


class SuggestedSpecialistsView(APIView):
    """
    GET /api/service-requests/<pk>/suggested-specialists/?mode=recommended|eligible&limit=10
    Returns:
      { specialists: [...], eligibleCount: N }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: str):
        user = request.user
        _assert_can_view_service_requests(user)

        sr = ServiceRequest.objects.filter(id=pk).first()
        if not sr:
            raise NotFound("Service request not found.")

        # only if provider is ACTIVE for contract
        ok = ContractProviderStatus.objects.filter(
            contract_id=sr.contract_id,
            provider_id=user.provider_id,
            status="ACTIVE",
        ).exists()
        if not ok:
            raise PermissionDenied("Not allowed for this contract.")

        mode = str(request.query_params.get("mode") or "recommended").lower()
        limit = int(request.query_params.get("limit") or 10)

        base = User.objects.filter(
            provider_id=user.provider_id,
            role="Specialist",
            is_active=True,
        ).exclude(availability="Fully Booked")

        eligible_count = base.count()

        # very simple matching heuristic for now:
        # - if sr.roles has technology/roleName/experienceLevel, try to match
        roles = sr.roles if isinstance(sr.roles, list) else []
        target = roles[0] if roles else {}
        t_exp = str(target.get("experienceLevel") or "").strip()
        t_tech = str(target.get("technology") or "").strip()
        t_role = str(target.get("roleName") or "").strip()

        qs = base
        if mode == "recommended" and (t_exp or t_tech or t_role):
            # Prefer experience match
            if t_exp:
                qs = qs.order_by()  # reset ordering
                qs = qs.extra(
                    select={"exp_match": "CASE WHEN experience_level = %s THEN 0 ELSE 1 END"},
                    select_params=[t_exp],
                    order_by=["exp_match", "created_at"],
                )
        else:
            qs = qs.order_by("created_at")

        specialists = []
        for s in qs[:limit]:
            specialists.append(
                {
                    "id": s.id,
                    "name": s.name,
                    "materialNumber": getattr(s, "material_number", "") or "",
                    "experienceLevel": getattr(s, "experience_level", "") or "",
                    "technologyLevel": getattr(s, "technology_level", "") or "",
                    "averageDailyRate": getattr(s, "average_daily_rate", None),
                    "availability": getattr(s, "availability", "") or "",
                    "skills": getattr(s, "skills", []) or [],
                }
            )

        return Response({"specialists": specialists, "eligibleCount": eligible_count})


class ServiceOrderListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ServiceOrderSerializer

    def get_queryset(self):
        user = self.request.user
        qs = ServiceOrder.objects.all().order_by("-created_at")

        if user.role in ["Provider Admin", "Supplier Representative"]:
            return qs.filter(provider=user.provider)

        if user.role == "Specialist":
            return qs.filter(assignments__specialist=user).distinct()

        raise PermissionDenied("Not allowed.")


class ServiceOrderDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ServiceOrderSerializer
    lookup_field = "id"

    def get_queryset(self):
        user = self.request.user
        qs = ServiceOrder.objects.select_related("provider", "service_request", "service_offer").prefetch_related("assignments")
        if user.role in ["Provider Admin", "Supplier Representative"]:
            return qs.filter(provider=user.provider)
        if user.role == "Specialist":
            return qs.filter(assignments__specialist=user).distinct()
        raise PermissionDenied("Not allowed.")
