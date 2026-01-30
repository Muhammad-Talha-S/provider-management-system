from decimal import Decimal
from django.utils.dateparse import parse_date, parse_datetime
from django.utils import timezone
from rest_framework import serializers

from accounts.models import User
from contracts.models import Contract, ContractProviderStatus
from contracts.services.contract_validation import (
    ContractValidationError,
    validate_sr_against_contract,
    normalize_sr_type,
)

from .models import ServiceRequest, ServiceOffer, ServiceOrder, ServiceOrderAssignment, ServiceOrderChangeRequest


class ServiceRequestSerializer(serializers.ModelSerializer):
    requestNumber = serializers.CharField(source="request_number")
    contractId = serializers.CharField(source="contract_id")
    contractSupplier = serializers.CharField(source="contract_supplier")

    requestedByUsername = serializers.CharField(source="requested_by_username")
    requestedByRole = serializers.CharField(source="requested_by_role")

    projectId = serializers.CharField(source="project_id")
    projectName = serializers.CharField(source="project_name")

    biddingCycleDays = serializers.IntegerField(source="bidding_cycle_days", allow_null=True, required=False)
    biddingStartAt = serializers.DateTimeField(source="bidding_start_at", allow_null=True, required=False)
    biddingEndAt = serializers.DateTimeField(source="bidding_end_at", allow_null=True, required=False)
    biddingActive = serializers.BooleanField(source="bidding_active", allow_null=True, required=False)

    class Meta:
        model = ServiceRequest
        fields = [
            "id",
            "external_id",
            "requestNumber",
            "title",
            "type",
            "status",
            "contractId",
            "contractSupplier",
            "projectId",
            "projectName",
            "requestedByUsername",
            "requestedByRole",
            "start_date",
            "end_date",
            "performance_location",
            "max_offers",
            "max_accepted_offers",
            "required_languages",
            "must_have_criteria",
            "nice_to_have_criteria",
            "task_description",
            "further_information",
            "roles",
            "biddingCycleDays",
            "biddingStartAt",
            "biddingEndAt",
            "biddingActive",
            "created_at",
        ]


# procurement/serializers.py
class ServiceOfferSpecialistInputSerializer(serializers.Serializer):
    userId = serializers.CharField()
    dailyRate = serializers.DecimalField(max_digits=12, decimal_places=2)
    travellingCost = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal("0"))

    # FIX: no default, allow null, so backend computes when not provided
    specialistCost = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True,
    )

    matchMustHaveCriteria = serializers.BooleanField(required=False, default=True)
    matchNiceToHaveCriteria = serializers.BooleanField(required=False, default=True)
    matchLanguageSkills = serializers.BooleanField(required=False, default=True)


class ServiceOfferSerializer(serializers.ModelSerializer):
    """
    Output format expected by frontend + aligns with your examples.
    """

    serviceRequest = ServiceRequestSerializer(source="service_request", read_only=True)
    offerStatus = serializers.CharField(source="status", read_only=True)

    specialists = serializers.SerializerMethodField()
    totalCost = serializers.SerializerMethodField()
    contractualRelationship = serializers.SerializerMethodField()
    subcontractorCompany = serializers.SerializerMethodField()
    supplierName = serializers.SerializerMethodField()
    supplierRepresentative = serializers.SerializerMethodField()

    class Meta:
        model = ServiceOffer
        fields = [
            "id",
            "serviceRequest",
            "specialists",
            "totalCost",
            "contractualRelationship",
            "subcontractorCompany",
            "supplierName",
            "supplierRepresentative",
            "offerStatus",
            "submitted_at",
            "created_at",
        ]

    def _resp(self, obj: ServiceOffer) -> dict:
        return obj.response if isinstance(obj.response, dict) else {}

    def get_specialists(self, obj: ServiceOffer):
        resp = self._resp(obj)
        specs = resp.get("specialists")
        return specs if isinstance(specs, list) else []

    def get_totalCost(self, obj: ServiceOffer):
        resp = self._resp(obj)
        v = resp.get("totalCost", 0)
        try:
            return float(v)
        except Exception:
            return 0

    def get_contractualRelationship(self, obj: ServiceOffer):
        return self._resp(obj).get("contractualRelationship") or ""

    def get_subcontractorCompany(self, obj: ServiceOffer):
        return self._resp(obj).get("subcontractorCompany")

    def get_supplierName(self, obj: ServiceOffer):
        return self._resp(obj).get("supplierName") or ""

    def get_supplierRepresentative(self, obj: ServiceOffer):
        return self._resp(obj).get("supplierRepresentative") or ""


class ServiceOfferCreateSerializer(serializers.Serializer):
    serviceRequestId = serializers.CharField()
    offerStatus = serializers.ChoiceField(choices=["DRAFT", "SUBMITTED"], default="DRAFT")

    contractualRelationship = serializers.CharField(required=False, allow_blank=True, default="")
    subcontractorCompany = serializers.CharField(required=False, allow_blank=True, default="")

    supplierName = serializers.CharField(required=False, allow_blank=True, default="")
    supplierRepresentative = serializers.CharField(required=False, allow_blank=True, default="")

    specialists = ServiceOfferSpecialistInputSerializer(many=True)

    def validate(self, attrs):
        req = self.context["request"]
        sr_id = attrs["serviceRequestId"]

        try:
            sr = ServiceRequest.objects.get(id=sr_id)
        except ServiceRequest.DoesNotExist:
            raise serializers.ValidationError({"serviceRequestId": "Service request not found."})

        # Must be visible: provider must be ACTIVE for this contract
        ok = ContractProviderStatus.objects.filter(
            contract_id=sr.contract_id,
            provider_id=req.user.provider_id,
            status="ACTIVE",
        ).exists()
        if not ok:
            raise serializers.ValidationError("Not allowed: your provider is not ACTIVE for this contract.")

        # SR must be in bidding state
        if (sr.bidding_active is not True) or (str(sr.status).upper() != "APPROVED_FOR_BIDDING"):
            raise serializers.ValidationError("Service request is not approved/active for bidding.")

        if sr.bidding_end_at and timezone.now() > sr.bidding_end_at:
            raise serializers.ValidationError("Bidding deadline has passed.")

        # Contract must exist for validation
        contract = Contract.objects.filter(id=sr.contract_id).first()
        if not contract or not isinstance(contract.config, dict):
            raise serializers.ValidationError("Linked contract config missing; cannot validate offer.")

        # Contract allows SR type / roles
        try:
            validate_sr_against_contract(
                contract_config=contract.config,
                sr_type=normalize_sr_type(sr.type),
                roles=sr.roles or [],
                must_have=sr.must_have_criteria or [],
                nice_to_have=sr.nice_to_have_criteria or [],
            )
        except ContractValidationError as e:
            raise serializers.ValidationError(str(e))

        # Specialists rules by SR type
        specs = attrs.get("specialists") or []
        if len(specs) == 0:
            raise serializers.ValidationError("Select at least one specialist.")

        sr_type = str(sr.type).upper()
        if sr_type == "SINGLE" and len(specs) != 1:
            raise serializers.ValidationError("SINGLE request requires exactly 1 specialist.")

        # Ensure specialists are from same provider and role=Specialist and active
        user_ids = [s["userId"] for s in specs]
        found = list(User.objects.filter(id__in=user_ids, provider_id=req.user.provider_id, role="Specialist", is_active=True))
        if len(found) != len(user_ids):
            raise serializers.ValidationError("One or more selected specialists are invalid for your provider.")

        attrs["_sr"] = sr
        return attrs

    def create(self, validated_data):
        req = self.context["request"]
        sr: ServiceRequest = validated_data["_sr"]

        # Build specialists list (enriched)
        input_specs = validated_data.get("specialists") or []
        users = {u.id: u for u in User.objects.filter(id__in=[s["userId"] for s in input_specs])}

        specialists_payload = []
        total_cost = Decimal("0")

        # Compute per-specialist cost (simple deterministic)
        # If SR.roles has manDays/onsiteDays, use role[0] days for all (good enough for now).
        roles = sr.roles if isinstance(sr.roles, list) else []
        role0 = roles[0] if roles else {}
        man_days = Decimal(str(role0.get("manDays") or 0))
        onsite_days = Decimal(str(role0.get("onsiteDays") or 0))

        for s in input_specs:
            u = users.get(s["userId"])
            daily = Decimal(str(s["dailyRate"]))
            travel = Decimal(str(s.get("travellingCost") or 0))

            # specialistCost: if FE sends it, accept; else compute
            sc = s.get("specialistCost")
            if sc is not None:
                specialist_cost = Decimal(str(sc))
            else:
                specialist_cost = (daily * man_days) + (travel * onsite_days)

            total_cost += specialist_cost

            specialists_payload.append(
                {
                    "userId": u.id,
                    "name": u.name,
                    "materialNumber": getattr(u, "material_number", "") or getattr(u, "materialNumber", "") or "",
                    "dailyRate": float(daily),
                    "travellingCost": float(travel),
                    "specialistCost": float(specialist_cost),
                    "matchMustHaveCriteria": bool(s.get("matchMustHaveCriteria", True)),
                    "matchNiceToHaveCriteria": bool(s.get("matchNiceToHaveCriteria", True)),
                    "matchLanguageSkills": bool(s.get("matchLanguageSkills", True)),
                }
            )

        response = {
            "supplierName": validated_data.get("supplierName") or req.user.provider.name,
            "supplierRepresentative": validated_data.get("supplierRepresentative") or req.user.name,
            "contractualRelationship": validated_data.get("contractualRelationship") or "",
            "subcontractorCompany": validated_data.get("subcontractorCompany") or "",
            "specialists": specialists_payload,
            "totalCost": float(total_cost),
        }

        snapshot = sr.external_payload or {}

        offer = ServiceOffer.objects.create(
            service_request=sr,
            provider=req.user.provider,
            created_by=req.user,
            request_snapshot=snapshot,
            response=response,
            status=validated_data.get("offerStatus", "DRAFT"),
        )

        if offer.status == "SUBMITTED":
            offer.submitted_at = timezone.now()
            offer.save(update_fields=["submitted_at"])

        return offer


class ServiceOrderAssignmentSerializer(serializers.ModelSerializer):
    specialistId = serializers.CharField(source="specialist_id", read_only=True)
    specialistName = serializers.CharField(source="specialist.name", read_only=True)
    materialNumber = serializers.SerializerMethodField()

    class Meta:
        model = ServiceOrderAssignment
        fields = [
            "specialistId",
            "specialistName",
            "materialNumber",
            "daily_rate",
            "travelling_cost",
            "specialist_cost",
            "match_must_have_criteria",
            "match_nice_to_have_criteria",
            "match_language_skills",
        ]

    def get_materialNumber(self, obj: ServiceOrderAssignment):
        u = obj.specialist
        return getattr(u, "material_number", "") or getattr(u, "materialNumber", "") or ""


class ServiceOrderSerializer(serializers.ModelSerializer):
    serviceOfferId = serializers.IntegerField(source="service_offer_id", read_only=True)
    serviceRequestId = serializers.CharField(source="service_request_id", read_only=True)
    providerId = serializers.CharField(source="provider_id", read_only=True)

    # IMPORTANT: make output match frontend expectations
    startDate = serializers.DateField(source="start_date", allow_null=True, required=False, read_only=True)
    endDate = serializers.DateField(source="end_date", allow_null=True, required=False, read_only=True)
    manDays = serializers.IntegerField(source="man_days", read_only=True)
    totalCost = serializers.DecimalField(source="total_cost", max_digits=12, decimal_places=2, read_only=True)

    # keep "location" as-is (frontend expects location)
    assignments = ServiceOrderAssignmentSerializer(many=True, read_only=True)

    class Meta:
        model = ServiceOrder
        fields = [
            "id",
            "serviceOfferId",
            "serviceRequestId",
            "providerId",
            "title",
            "startDate",
            "endDate",
            "location",
            "manDays",
            "totalCost",
            "status",
            "assignments",
            "created_at",
        ]



def upsert_group3_service_request(item: dict) -> ServiceRequest:
    """
    Maps Group3 payload -> our ServiceRequest model.
    Hardcode contract_id=C003 for now (your requirement).
    """
    request_number = item.get("requestNumber") or ""
    if not request_number:
        raise ValueError("Missing requestNumber")

    sr_type = (item.get("type") or "SINGLE").upper()

    # TEMP: until Group3 fixes / until Group2 integration is connected
    contract_id = "C003"

    roles = item.get("roles") if isinstance(item.get("roles"), list) else []

    start_date = parse_date(item.get("startDate")) if item.get("startDate") else None
    end_date = parse_date(item.get("endDate")) if item.get("endDate") else None

    bidding_start_at = parse_datetime(item.get("biddingStartAt")) if item.get("biddingStartAt") else None
    bidding_end_at = parse_datetime(item.get("biddingEndAt")) if item.get("biddingEndAt") else None

    sr, _ = ServiceRequest.objects.update_or_create(
        id=request_number,
        defaults={
            "external_id": item.get("id"),
            "request_number": request_number,
            "title": item.get("title") or "",
            "type": sr_type,
            "status": item.get("status") or "DRAFT",
            "contract_id": contract_id,
            "contract_supplier": item.get("contractSupplier") or "",
            "start_date": start_date,
            "end_date": end_date,
            "performance_location": (item.get("performanceLocation") or "").strip() or "Onsite",
            "max_offers": item.get("maxOffers"),
            "max_accepted_offers": item.get("maxAcceptedOffers"),
            "required_languages": item.get("requiredLanguages") or [],
            "must_have_criteria": item.get("mustHaveCriteria") or [],
            "nice_to_have_criteria": item.get("niceToHaveCriteria") or [],
            "task_description": item.get("taskDescription") or "",
            "further_information": item.get("furtherInformation") or "",
            "roles": roles,
            "project_id": item.get("projectId") or "",
            "project_name": item.get("projectName") or "",
            "requested_by_username": item.get("requestedByUsername") or "",
            "requested_by_role": item.get("requestedByRole") or "",
            "bidding_cycle_days": item.get("biddingCycleDays"),
            "bidding_start_at": bidding_start_at,
            "bidding_end_at": bidding_end_at,
            "bidding_active": item.get("biddingActive"),
            "external_payload": item,
        },
    )
    return sr


class ServiceOrderChangeRequestSerializer(serializers.ModelSerializer):
    serviceOrderId = serializers.IntegerField(source="service_order_id", read_only=True)
    providerId = serializers.CharField(source="provider_id", read_only=True)

    createdBySystem = serializers.BooleanField(source="created_by_system", read_only=True)
    createdByUserId = serializers.CharField(source="created_by_user_id", read_only=True)
    decidedByUserId = serializers.CharField(source="decided_by_user_id", read_only=True)

    providerResponseNote = serializers.CharField(source="provider_response_note", read_only=True)

    newEndDate = serializers.DateField(source="new_end_date", allow_null=True, required=False)
    additionalManDays = serializers.IntegerField(source="additional_man_days", allow_null=True, required=False)
    newTotalCost = serializers.DecimalField(source="new_total_cost", max_digits=12, decimal_places=2, allow_null=True, required=False)

    oldSpecialistId = serializers.CharField(source="old_specialist_id", allow_null=True, required=False, read_only=True)
    newSpecialistId = serializers.CharField(source="new_specialist_id", allow_null=True, required=False)

    class Meta:
        model = ServiceOrderChangeRequest
        fields = [
            "id",
            "serviceOrderId",
            "providerId",
            "type",
            "status",
            "createdBySystem",
            "createdByUserId",
            "decidedByUserId",
            "created_at",
            "decided_at",
            "reason",
            "providerResponseNote",
            "newEndDate",
            "additionalManDays",
            "newTotalCost",
            "oldSpecialistId",
            "newSpecialistId",
        ]


class ServiceOrderChangeRequestCreateSerializer(serializers.Serializer):
    """
    Create CR from our UI:
    - Substitution: { serviceOrderId, newSpecialistId, reason? }
    - Extension:    { serviceOrderId, newEndDate, additionalManDays, newTotalCost, reason? }

    NOTE: frontend currently only sends substitution, but we support both.
    """
    serviceOrderId = serializers.IntegerField()
    type = serializers.ChoiceField(choices=["Extension", "Substitution"], required=False)

    reason = serializers.CharField(required=False, allow_blank=True, default="")

    # Extension
    newEndDate = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    additionalManDays = serializers.IntegerField(required=False, allow_null=True)
    newTotalCost = serializers.DecimalField(required=False, allow_null=True, max_digits=12, decimal_places=2)

    # Substitution
    newSpecialistId = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs):
        req = self.context["request"]
        order_id = attrs["serviceOrderId"]

        order = ServiceOrder.objects.select_related("provider").filter(id=order_id).first()
        if not order:
            raise serializers.ValidationError({"serviceOrderId": "Service order not found."})

        if req.user.role not in ["Provider Admin", "Supplier Representative"]:
            raise serializers.ValidationError("Not allowed.")

        if order.provider_id != req.user.provider_id:
            raise serializers.ValidationError("Not allowed: order belongs to another provider.")

        # Infer type if not provided (frontend currently doesn't send type)
        cr_type = attrs.get("type")
        if not cr_type:
            cr_type = "Substitution" if attrs.get("newSpecialistId") else "Extension"
        attrs["type"] = cr_type

        if cr_type == "Substitution":
            ns = (attrs.get("newSpecialistId") or "").strip()
            if not ns:
                raise serializers.ValidationError({"newSpecialistId": "Replacement specialist is required."})

            specialist = User.objects.filter(id=ns, provider_id=req.user.provider_id, role="Specialist", is_active=True).first()
            if not specialist:
                raise serializers.ValidationError({"newSpecialistId": "Invalid specialist for your provider."})

        if cr_type == "Extension":
            if not attrs.get("newEndDate"):
                raise serializers.ValidationError({"newEndDate": "newEndDate is required for Extension."})

        attrs["_order"] = order
        return attrs

    def create(self, validated_data):
        req = self.context["request"]
        order: ServiceOrder = validated_data["_order"]

        cr_type = validated_data["type"]
        reason = validated_data.get("reason") or ""

        old_spec = None
        first_assignment = order.assignments.select_related("specialist").first()
        if first_assignment:
            old_spec = first_assignment.specialist

        new_end_date = None
        if validated_data.get("newEndDate"):
            new_end_date = parse_date(validated_data["newEndDate"])

        new_spec = None
        if validated_data.get("newSpecialistId"):
            new_spec = User.objects.filter(id=validated_data["newSpecialistId"]).first()

        cr = ServiceOrderChangeRequest.objects.create(
            service_order=order,
            provider=order.provider,
            type=cr_type,
            status="Requested",
            created_by_system=False,
            created_by_user=req.user,
            reason=reason,
            new_end_date=new_end_date,
            additional_man_days=validated_data.get("additionalManDays"),
            new_total_cost=validated_data.get("newTotalCost"),
            old_specialist=old_spec,
            new_specialist=new_spec,
        )
        return cr


class ServiceOrderChangeRequestDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=["Approve", "Decline"])
    providerResponseNote = serializers.CharField(required=False, allow_blank=True, default="")
    newSpecialistId = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs):
        cr = self.context.get("cr")
        decision = attrs.get("decision")
        new_sid = (attrs.get("newSpecialistId") or "").strip()

        if cr and cr.type == "Substitution" and cr.created_by_system and decision == "Approve":
            if not new_sid:
                raise serializers.ValidationError({"newSpecialistId": "Replacement specialist is required to approve an inbound substitution."})

            ok = User.objects.filter(
                id=new_sid,
                provider_id=cr.provider_id,
                role="Specialist",
                is_active=True,
            ).exists()
            if not ok:
                raise serializers.ValidationError({"newSpecialistId": "Invalid specialist for this provider."})

        return attrs

    def apply_decision(self, cr, decided_by_user):
        decision = self.validated_data["decision"]
        note = self.validated_data.get("providerResponseNote") or ""
        new_sid = (self.validated_data.get("newSpecialistId") or "").strip()

        # idempotent
        if cr.status != "Requested":
            return cr

        order = cr.service_order  # ✅ define order FIRST

        # If inbound substitution + approve, attach chosen replacement specialist
        if cr.type == "Substitution" and cr.created_by_system and decision == "Approve":
            if new_sid:
                cr.new_specialist = User.objects.filter(id=new_sid).first()

        # Save decision on CR first
        cr.decided_by_user = decided_by_user
        cr.provider_response_note = note
        cr.decided_at = timezone.now()
        cr.status = "Approved" if decision == "Approve" else "Declined"
        cr.save(update_fields=["new_specialist", "decided_by_user", "provider_response_note", "decided_at", "status"])

        if cr.status != "Approved":
            return cr

        # ---- Apply changes to the order on approval ----
        if cr.type == "Extension":
            update_fields = []
            if cr.new_end_date:
                order.end_date = cr.new_end_date
                update_fields.append("end_date")
            if cr.additional_man_days is not None:
                order.man_days = int(order.man_days or 0) + int(cr.additional_man_days or 0)
                update_fields.append("man_days")
            if cr.new_total_cost is not None:
                order.total_cost = cr.new_total_cost
                update_fields.append("total_cost")
            if update_fields:
                order.save(update_fields=update_fields)
            return cr

        if cr.type == "Substitution":
            if not cr.new_specialist:
                return cr

            effective = cr.substitution_date or timezone.now().date()

            # Old assignment: close it at effective date
            old_assignment = order.assignments.select_related("specialist").order_by("created_at").first()
            if old_assignment:
                old_assignment.end_date = effective
                old_assignment.save(update_fields=["end_date"])

            # New assignment: start at effective date
            # Copy commercial fields from old assignment if it exists
            daily = old_assignment.daily_rate if old_assignment else 0
            travel = old_assignment.travelling_cost if old_assignment else 0
            cost = old_assignment.specialist_cost if old_assignment else 0

            ServiceOrderAssignment.objects.create(
                order=order,
                specialist=cr.new_specialist,
                daily_rate=daily,
                travelling_cost=travel,
                specialist_cost=cost,
                match_must_have_criteria=True,
                match_nice_to_have_criteria=True,
                match_language_skills=True,
                start_date=effective,
                end_date=None,
            )

            return cr

        return cr