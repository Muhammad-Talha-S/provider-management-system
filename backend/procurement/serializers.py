from rest_framework import serializers
from django.utils import timezone
from django.db import transaction

from .models import (
    ServiceRequest,
    ServiceOffer,
    ServiceOrder,
    ServiceOrderChangeRequest,
)


# -------------------------
# Service Requests
# -------------------------
class ServiceRequestSerializer(serializers.ModelSerializer):
    linkedContractId = serializers.CharField(
        source="linked_contract_id", required=False, allow_null=True, allow_blank=True
    )
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

    class Meta:
        model = ServiceRequest
        fields = [
            "id",
            "title",
            "type",
            "linkedContractId",
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
# Service Offers
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

    def create(self, validated_data):
        request = self.context["request"]
        sr_id = validated_data.pop("serviceRequestId")
        specialist_id = validated_data.pop("specialistId")

        travel = validated_data.pop("travelCostPerOnsiteDay", 0)
        rel = validated_data.pop("contractualRelationship", "Employee")
        subc = validated_data.pop("subcontractorCompany", None)
        mh = validated_data.pop("mustHaveMatchPercentage", None)
        nh = validated_data.pop("niceToHaveMatchPercentage", None)

        sr = ServiceRequest.objects.get(id=sr_id)

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

        return attrs


# -------------------------
# Service Orders
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


# -------------------------
# Group 3 Offer Decision (API-key)
# -------------------------
class Group3OfferDecisionSerializer(serializers.Serializer):
    """
    Group3 decides on submitted offers.
    - Accept => offer Accepted + create ServiceOrder + close ServiceRequest
    - Reject => offer Rejected
    """
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

        # If already decided, keep idempotent behavior
        if offer.status in ["Accepted", "Rejected"]:
            order = getattr(offer, "service_order", None)
            return {"offer": offer, "order": order}

        if decision == "Reject":
            offer.status = "Rejected"
            offer.save(update_fields=["status"])
            return {"offer": offer, "order": None}

        # Accept:
        offer.status = "Accepted"
        offer.save(update_fields=["status"])

        sr = offer.service_request

        # Create order if not already present (OneToOne)
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

        # Close the Service Request after acceptance
        if sr.status != "Closed":
            sr.status = "Closed"
            sr.save(update_fields=["status"])

        return {"offer": offer, "order": order}


# -------------------------
# Change Requests
# -------------------------
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
