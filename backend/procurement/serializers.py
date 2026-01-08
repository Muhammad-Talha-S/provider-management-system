from rest_framework import serializers
from .models import ServiceRequest, ServiceOffer, ServiceOrder


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


# Group 3 decision: Accept/Reject (API Key)
class ServiceOfferDecisionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["Accepted", "Rejected"])

    def validate(self, attrs):
        offer: ServiceOffer = self.context["offer"]
        new_status = attrs["status"]
        if offer.status != "Submitted":
            raise serializers.ValidationError("Only Submitted offers can be accepted/rejected.")
        return attrs


class ServiceOrderSerializer(serializers.ModelSerializer):
    serviceOfferId = serializers.IntegerField(source="service_offer_id")
    serviceRequestId = serializers.CharField(source="service_request_id")
    providerId = serializers.CharField(source="provider_id")
    specialistId = serializers.CharField(source="specialist_id")

    startDate = serializers.DateField(source="start_date", allow_null=True)
    endDate = serializers.DateField(source="end_date", allow_null=True)
    manDays = serializers.IntegerField(source="man_days")
    changeHistory = serializers.JSONField(source="change_history")

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
            "status",
            "changeHistory",
            "created_at",
        ]


class ServiceOrderSubstitutionSerializer(serializers.Serializer):
    newSpecialistId = serializers.CharField()
    reason = serializers.CharField(allow_blank=True, required=False)


class ServiceOrderExtensionSerializer(serializers.Serializer):
    endDate = serializers.DateField()
    manDays = serializers.IntegerField(min_value=0)
    reason = serializers.CharField(allow_blank=True, required=False)
