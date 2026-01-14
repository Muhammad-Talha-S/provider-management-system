from rest_framework import serializers
from django.utils import timezone
from django.db import transaction
from datetime import timedelta

from .models import ServiceRequest, ServiceOffer, ServiceOrder, ServiceOrderChangeRequest
from contracts.models import Contract


# -------------------------
# Helpers
# -------------------------
def _get_contract_or_error(contract_id: str) -> Contract:
    try:
        return Contract.objects.get(id=contract_id)
    except Contract.DoesNotExist:
        raise serializers.ValidationError({"linkedContractId": "Contract not found."})


def _get_request_cfg(contract: Contract, sr_type: str) -> dict | None:
    cfgs = contract.allowed_request_configs or {}
    return cfgs.get(sr_type)


# -------------------------
# Service Requests (Read)
# -------------------------
class ServiceRequestSerializer(serializers.ModelSerializer):
    linkedContractId = serializers.CharField(source="linked_contract_id")
    experienceLevel = serializers.CharField(source="experience_level")
    startDate = serializers.DateField(source="start_date", allow_null=True, required=False)
    endDate = serializers.DateField(source="end_date", allow_null=True, required=False)

    totalManDays = serializers.IntegerField(source="total_man_days")
    onsiteDays = serializers.IntegerField(source="onsite_days")
    performanceLocation = serializers.CharField(source="performance_location")

    requiredLanguages = serializers.JSONField(source="required_languages")
    mustHaveCriteria = serializers.JSONField(source="must_have_criteria")
    niceToHaveCriteria = serializers.JSONField(source="nice_to_have_criteria")

    taskDescription = serializers.CharField(source="task_description")

    offerDeadlineAt = serializers.DateTimeField(source="offer_deadline_at", allow_null=True, required=False)
    cycles = serializers.IntegerField(allow_null=True, required=False)

    class Meta:
        model = ServiceRequest
        fields = [
            "id",
            "title",
            "type",
            "linkedContractId",
            "offerDeadlineAt",
            "cycles",
            "role",
            "technology",
            "experienceLevel",
            "startDate",
            "endDate",
            "totalManDays",
            "onsiteDays",
            "performanceLocation",
            "requiredLanguages",
            "mustHaveCriteria",
            "niceToHaveCriteria",
            "taskDescription",
            "status",
        ]


# -------------------------
# Service Requests (Group3 Create - API key)
# -------------------------
class Group3ServiceRequestCreateSerializer(serializers.Serializer):
    id = serializers.CharField(max_length=20)
    title = serializers.CharField(max_length=255)
    type = serializers.ChoiceField(choices=["Single", "Multi", "Team", "Work Contract"])

    linkedContractId = serializers.CharField()

    role = serializers.CharField(max_length=120)
    technology = serializers.CharField(required=False, allow_blank=True)
    experienceLevel = serializers.CharField(required=False, allow_blank=True)

    startDate = serializers.DateField(required=False, allow_null=True)
    endDate = serializers.DateField(required=False, allow_null=True)

    totalManDays = serializers.IntegerField(required=False, default=0)
    onsiteDays = serializers.IntegerField(required=False, default=0)

    performanceLocation = serializers.CharField(required=False, allow_blank=True)

    requiredLanguages = serializers.JSONField(required=False, default=list)
    mustHaveCriteria = serializers.JSONField(required=False, default=list)
    niceToHaveCriteria = serializers.JSONField(required=False, default=list)

    taskDescription = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        contract_id = attrs["linkedContractId"]
        sr_type = attrs["type"]

        contract = _get_contract_or_error(contract_id)

        # Must be awarded + active (Milestone 4)
        if contract.status != "Active" or not contract.awarded_provider_id:
            raise serializers.ValidationError({"linkedContractId": "Contract is not Active/Awarded."})

        # Must be allowed by contract config (Milestone 4/5)
        cfg = _get_request_cfg(contract, sr_type)
        if not cfg:
            raise serializers.ValidationError({"type": "This service request type is not allowed by contract config."})

        # Validate config structure
        if "offerDeadlineDays" not in cfg or "cycles" not in cfg:
            raise serializers.ValidationError({"linkedContractId": "Contract config missing offerDeadlineDays/cycles."})

        attrs["_contract"] = contract
        attrs["_cfg"] = cfg
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        contract: Contract = validated_data["_contract"]
        cfg: dict = validated_data["_cfg"]

        offer_deadline_days = int(cfg.get("offerDeadlineDays", 0))
        cycles = int(cfg.get("cycles", 1))

        offer_deadline_at = timezone.now() + timedelta(days=offer_deadline_days) if offer_deadline_days > 0 else None

        sr = ServiceRequest.objects.create(
            id=validated_data["id"],
            title=validated_data["title"],
            type=validated_data["type"],
            linked_contract_id=validated_data["linkedContractId"],
            offer_deadline_at=offer_deadline_at,
            cycles=cycles,
            role=validated_data["role"],
            technology=validated_data.get("technology", ""),
            experience_level=validated_data.get("experienceLevel", ""),
            start_date=validated_data.get("startDate", None),
            end_date=validated_data.get("endDate", None),
            total_man_days=validated_data.get("totalManDays", 0),
            onsite_days=validated_data.get("onsiteDays", 0),
            performance_location=validated_data.get("performanceLocation", "Onshore"),
            required_languages=validated_data.get("requiredLanguages", []),
            must_have_criteria=validated_data.get("mustHaveCriteria", []),
            nice_to_have_criteria=validated_data.get("niceToHaveCriteria", []),
            task_description=validated_data.get("taskDescription", ""),
            status="Open",
        )
        return sr


# -------------------------
# Service Offers (Read)
# -------------------------
class ServiceOfferSerializer(serializers.ModelSerializer):
    serviceRequestId = serializers.CharField(source="service_request_id")
    specialistId = serializers.CharField(source="specialist_id")
    providerId = serializers.CharField(source="provider_id")

    travelCostPerOnsiteDay = serializers.DecimalField(
        source="travel_cost_per_onsite_day", max_digits=10, decimal_places=2
    )
    contractualRelationship = serializers.CharField(source="contractual_relationship")
    subcontractorCompany = serializers.CharField(source="subcontractor_company", allow_null=True, required=False)
    mustHaveMatchPercentage = serializers.IntegerField(source="must_have_match_percentage", allow_null=True, required=False)
    niceToHaveMatchPercentage = serializers.IntegerField(source="nice_to_have_match_percentage", allow_null=True, required=False)

    class Meta:
        model = ServiceOffer
        fields = [
            "id",
            "serviceRequestId",
            "providerId",
            "specialistId",
            "daily_rate",
            "travelCostPerOnsiteDay",
            "total_cost",
            "contractualRelationship",
            "subcontractorCompany",
            "mustHaveMatchPercentage",
            "niceToHaveMatchPercentage",
            "status",
            "submitted_at",
            "created_at",
        ]


# -------------------------
# Service Offers (Create) - with Milestone 4/5 enforcement
# -------------------------
class ServiceOfferCreateSerializer(serializers.ModelSerializer):
    serviceRequestId = serializers.CharField(write_only=True)
    specialistId = serializers.CharField(write_only=True)

    travelCostPerOnsiteDay = serializers.DecimalField(write_only=True, max_digits=10, decimal_places=2, required=False)
    contractualRelationship = serializers.CharField(write_only=True, required=False)
    subcontractorCompany = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    mustHaveMatchPercentage = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    niceToHaveMatchPercentage = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = ServiceOffer
        fields = [
            "serviceRequestId",
            "specialistId",
            "daily_rate",
            "travelCostPerOnsiteDay",
            "total_cost",
            "contractualRelationship",
            "subcontractorCompany",
            "mustHaveMatchPercentage",
            "niceToHaveMatchPercentage",
            "status",
        ]

    def validate(self, attrs):
        request = self.context["request"]
        sr_id = attrs.get("serviceRequestId")

        try:
            sr = ServiceRequest.objects.get(id=sr_id)
        except ServiceRequest.DoesNotExist:
            raise serializers.ValidationError({"serviceRequestId": "Service Request not found."})

        if sr.status != "Open":
            raise serializers.ValidationError("Cannot create offer for a Closed Service Request.")

        # Milestone 4: SR must reference contract
        if not sr.linked_contract_id:
            raise serializers.ValidationError("Service Request is missing linked contract.")

        contract = _get_contract_or_error(sr.linked_contract_id)

        # Must be Active & awarded
        if contract.status != "Active" or not contract.awarded_provider_id:
            raise serializers.ValidationError("Contract is not Active/Awarded; cannot submit offers.")

        # Only awarded provider can offer
        if contract.awarded_provider_id != request.user.provider_id:
            raise serializers.ValidationError("Not allowed: your provider is not awarded for this contract.")

        # SR.type must be allowed by contract config
        cfg = _get_request_cfg(contract, sr.type)
        if not cfg:
            raise serializers.ValidationError("This SR type is not allowed under the awarded contract configuration.")

        # Milestone 5: deadline enforcement
        if sr.offer_deadline_at and timezone.now() > sr.offer_deadline_at:
            raise serializers.ValidationError("Offer deadline passed for this Service Request.")

        attrs["_sr"] = sr
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        sr: ServiceRequest = validated_data.pop("_sr")

        specialist_id = validated_data.pop("specialistId")
        _ = validated_data.pop("serviceRequestId", None)

        travel = validated_data.pop("travelCostPerOnsiteDay", 0)
        rel = validated_data.pop("contractualRelationship", "Employee")
        subc = validated_data.pop("subcontractorCompany", None)
        mh = validated_data.pop("mustHaveMatchPercentage", None)
        nh = validated_data.pop("niceToHaveMatchPercentage", None)

        offer = ServiceOffer.objects.create(
            service_request=sr,
            provider=request.user.provider,
            specialist_id=specialist_id,
            created_by=request.user,
            travel_cost_per_onsite_day=travel,
            contractual_relationship=rel,
            subcontractor_company=subc,
            must_have_match_percentage=mh,
            nice_to_have_match_percentage=nh,
            **validated_data,
        )

        if offer.status == "Submitted" and offer.submitted_at is None:
            offer.submitted_at = timezone.now()
            offer.save(update_fields=["submitted_at"])

        return offer


class ServiceOfferStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["Submitted", "Withdrawn"])

    def validate(self, attrs):
        offer: ServiceOffer = self.context["offer"]
        new_status = attrs["status"]

        if new_status == "Submitted" and offer.status != "Draft":
            raise serializers.ValidationError("Only Draft offers can be submitted.")
        if new_status == "Withdrawn" and offer.status != "Submitted":
            raise serializers.ValidationError("Only Submitted offers can be withdrawn.")

        # Milestone 5: enforce deadline on submission too
        sr = offer.service_request
        if new_status == "Submitted":
            if sr.offer_deadline_at and timezone.now() > sr.offer_deadline_at:
                raise serializers.ValidationError("Offer deadline passed for this Service Request.")

        return attrs


# -------------------------
# Service Orders / Change Requests (UNCHANGED from your file)
# -------------------------
class ServiceOrderSerializer(serializers.ModelSerializer):
    serviceOfferId = serializers.IntegerField(source="service_offer_id")
    serviceRequestId = serializers.CharField(source="service_request_id")
    providerId = serializers.CharField(source="provider_id")
    specialistId = serializers.CharField(source="specialist_id")

    startDate = serializers.DateField(source="start_date", allow_null=True, required=False)
    endDate = serializers.DateField(source="end_date", allow_null=True, required=False)

    manDays = serializers.IntegerField(source="man_days")

    class Meta:
        model = ServiceOrder
        fields = [
            "id",
            "serviceOfferId",
            "serviceRequestId",
            "providerId",
            "specialistId",
            "title",
            "startDate",
            "endDate",
            "location",
            "manDays",
            "total_cost",
            "status",
            "created_at",
        ]


class Group3OfferDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=["Accept", "Reject"])

    def validate(self, attrs):
        offer: ServiceOffer = self.context["offer"]
        if offer.status not in ["Submitted", "Accepted", "Rejected"]:
            raise serializers.ValidationError("Only Submitted offers can be decided by Group 3.")
        return attrs

    @transaction.atomic
    def save(self, **kwargs):
        offer: ServiceOffer = self.context["offer"]
        decision = self.validated_data["decision"]

        if offer.status in ["Accepted", "Rejected"]:
            order = getattr(offer, "service_order", None)
            return {"offer": offer, "order": order}

        if decision == "Reject":
            offer.status = "Rejected"
            offer.save(update_fields=["status"])
            return {"offer": offer, "order": None}

        offer.status = "Accepted"
        offer.save(update_fields=["status"])

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
                "location": sr.performance_location or "Onshore",
                "man_days": sr.total_man_days or 0,
                "total_cost": offer.total_cost or 0,
                "status": "Active",
            },
        )

        if sr.status != "Closed":
            sr.status = "Closed"
            sr.save(update_fields=["status"])

        return {"offer": offer, "order": order}


class ServiceOrderChangeRequestSerializer(serializers.ModelSerializer):
    serviceOrderId = serializers.IntegerField(source="service_order_id")
    providerId = serializers.CharField(source="provider_id")

    createdBySystem = serializers.BooleanField(source="created_by_system")
    createdByUserId = serializers.CharField(source="created_by_user_id", allow_null=True, required=False)
    decidedByUserId = serializers.CharField(source="decided_by_user_id", allow_null=True, required=False)

    newEndDate = serializers.DateField(source="new_end_date", allow_null=True, required=False)
    additionalManDays = serializers.IntegerField(source="additional_man_days", allow_null=True, required=False)
    newTotalCost = serializers.DecimalField(source="new_total_cost", max_digits=12, decimal_places=2, allow_null=True, required=False)

    oldSpecialistId = serializers.CharField(source="old_specialist_id", allow_null=True, required=False)
    newSpecialistId = serializers.CharField(source="new_specialist_id", allow_null=True, required=False)

    providerResponseNote = serializers.CharField(source="provider_response_note", required=False, allow_blank=True)

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


class ProviderCreateSubstitutionRequestSerializer(serializers.Serializer):
    """
    Provider-initiated substitution request (JWT).
    """
    serviceOrderId = serializers.IntegerField()
    newSpecialistId = serializers.CharField()
    reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user

        if user.role not in ["Provider Admin", "Supplier Representative"]:
            raise serializers.ValidationError("Only Provider Admin or Supplier Representative can request substitution.")

        order_id = attrs["serviceOrderId"]
        try:
            order = ServiceOrder.objects.select_related("provider", "specialist").get(id=order_id)
        except ServiceOrder.DoesNotExist:
            raise serializers.ValidationError("Service order not found.")

        if order.provider_id != user.provider_id:
            raise serializers.ValidationError("Not allowed.")

        from accounts.models import User as AccountUser
        try:
            new_sp = AccountUser.objects.get(id=attrs["newSpecialistId"])
        except AccountUser.DoesNotExist:
            raise serializers.ValidationError("New specialist not found.")

        if new_sp.role != "Specialist":
            raise serializers.ValidationError("New specialist must be a Specialist.")
        if new_sp.provider_id != user.provider_id:
            raise serializers.ValidationError("New specialist must belong to your provider.")
        if new_sp.id == order.specialist_id:
            raise serializers.ValidationError("New specialist must be different from current specialist.")

        attrs["_order"] = order
        attrs["_new_sp"] = new_sp
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        order = validated_data["_order"]
        new_sp = validated_data["_new_sp"]

        cr = ServiceOrderChangeRequest.objects.create(
            service_order=order,
            provider_id=order.provider_id,
            type="Substitution",
            status="Requested",
            created_by_system=False,
            created_by_user=request.user,
            reason=validated_data.get("reason", ""),
            old_specialist_id=order.specialist_id,
            new_specialist_id=new_sp.id,
        )
        return cr


class Group3ExtensionCreateSerializer(serializers.Serializer):
    """
    Group3 creates extension request (API-key).
    """
    newEndDate = serializers.DateField()
    additionalManDays = serializers.IntegerField(min_value=1)
    newTotalCost = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        order: ServiceOrder = self.context["order"]
        if order.status != "Active":
            raise serializers.ValidationError("Only Active orders can be extended.")
        return attrs

    def create(self, validated_data):
        order: ServiceOrder = self.context["order"]
        cr = ServiceOrderChangeRequest.objects.create(
            service_order=order,
            provider_id=order.provider_id,
            type="Extension",
            status="Requested",
            created_by_system=True,
            created_by_user=None,
            reason=validated_data.get("reason", ""),
            new_end_date=validated_data["newEndDate"],
            additional_man_days=validated_data["additionalManDays"],
            new_total_cost=validated_data.get("newTotalCost", None),
        )
        return cr


class Group3SubstitutionCreateSerializer(serializers.Serializer):
    """
    Group3 creates substitution request (API-key).
    Provider will approve/decline.
    """
    newSpecialistId = serializers.CharField()
    reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        order: ServiceOrder = self.context["order"]

        from accounts.models import User as AccountUser
        try:
            new_sp = AccountUser.objects.get(id=attrs["newSpecialistId"])
        except AccountUser.DoesNotExist:
            raise serializers.ValidationError("New specialist not found.")

        if new_sp.role != "Specialist":
            raise serializers.ValidationError("New specialist must be a Specialist.")
        if new_sp.provider_id != order.provider_id:
            raise serializers.ValidationError("New specialist must belong to the same provider as the order.")
        if new_sp.id == order.specialist_id:
            raise serializers.ValidationError("New specialist must be different from current specialist.")

        attrs["_new_sp"] = new_sp
        return attrs

    def create(self, validated_data):
        order: ServiceOrder = self.context["order"]
        new_sp = validated_data["_new_sp"]

        cr = ServiceOrderChangeRequest.objects.create(
            service_order=order,
            provider_id=order.provider_id,
            type="Substitution",
            status="Requested",
            created_by_system=True,
            created_by_user=None,
            reason=validated_data.get("reason", ""),
            old_specialist_id=order.specialist_id,
            new_specialist_id=new_sp.id,
        )
        return cr


class ProviderDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=["Approve", "Decline"])
    providerResponseNote = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        cr: ServiceOrderChangeRequest = self.context["change_request"]

        if cr.status != "Requested":
            raise serializers.ValidationError("Only Requested change requests can be decided.")

        user = self.context["request"].user
        if user.role not in ["Provider Admin", "Supplier Representative"]:
            raise serializers.ValidationError("Not allowed.")

        if cr.provider_id != user.provider_id:
            raise serializers.ValidationError("Not allowed.")

        return attrs
