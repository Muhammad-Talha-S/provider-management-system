from rest_framework import serializers
from .models import Contract, ContractOffer, ContractAward
from activitylog.utils import log_activity


class ContractSerializer(serializers.ModelSerializer):
    publishedAt = serializers.DateTimeField(source="published_at", allow_null=True, required=False)
    offerDeadline = serializers.DateTimeField(source="offer_deadline", allow_null=True, required=False)

    startDate = serializers.DateField(source="start_date", allow_null=True, required=False)
    endDate = serializers.DateField(source="end_date", allow_null=True, required=False)

    scopeOfWork = serializers.CharField(source="scope_of_work", required=False)
    termsAndConditions = serializers.CharField(source="terms_and_conditions", required=False)

    functionalWeight = serializers.IntegerField(source="functional_weight", allow_null=True, required=False)
    commercialWeight = serializers.IntegerField(source="commercial_weight", allow_null=True, required=False)

    allowedRequestConfigs = serializers.JSONField(source="allowed_request_configs", allow_null=True, required=False)

    # ✅ Figma fields
    acceptedRequestTypes = serializers.JSONField(source="accepted_request_types", required=False)
    allowedDomains = serializers.JSONField(source="allowed_domains", required=False)
    allowedRoles = serializers.JSONField(source="allowed_roles", required=False)
    experienceLevels = serializers.JSONField(source="experience_levels", required=False)

    offerCyclesAndDeadlines = serializers.JSONField(source="offer_cycles_and_deadlines", required=False)
    pricingLimits = serializers.JSONField(source="pricing_limits", required=False)
    versionHistory = serializers.JSONField(source="version_history", required=False)

    awardedProviderId = serializers.CharField(source="awarded_provider_id", allow_null=True, required=False)

    class Meta:
        model = Contract
        fields = [
            "id", "title", "status", "kind",
            "publishedAt", "offerDeadline",
            "startDate", "endDate",
            "scopeOfWork", "termsAndConditions",
            "functionalWeight", "commercialWeight",
            "allowedRequestConfigs",
            "acceptedRequestTypes", "allowedDomains", "allowedRoles", "experienceLevels",
            "offerCyclesAndDeadlines", "pricingLimits", "versionHistory",
            "awardedProviderId",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        my_pid = getattr(getattr(request, "user", None), "provider_id", None)

        if instance.awarded_provider_id and instance.awarded_provider_id != my_pid:
            data["awardedProviderId"] = None
        return data



class Group2AwardContractSerializer(serializers.Serializer):
    providerId = serializers.CharField()
    note = serializers.CharField(required=False, allow_blank=True)


class ContractOfferSerializer(serializers.ModelSerializer):
    contractId = serializers.CharField(source="contract_id", read_only=True)
    providerId = serializers.CharField(source="provider_id", read_only=True)
    createdByUserId = serializers.CharField(source="created_by_id", allow_null=True, read_only=True)

    proposedDailyRate = serializers.DecimalField(
        source="proposed_daily_rate",
        max_digits=12,
        decimal_places=2,
        allow_null=True,
        required=False
    )
    proposedTerms = serializers.CharField(source="proposed_terms", required=False, allow_blank=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    submittedAt = serializers.DateTimeField(source="submitted_at", read_only=True)

    class Meta:
        model = ContractOffer
        fields = [
            "id",
            "contractId",
            "providerId",
            "createdByUserId",
            "status",
            "proposedDailyRate",
            "proposedTerms",
            "note",
            "submittedAt",
            "createdAt",
        ]


class ContractOfferCreateSerializer(serializers.Serializer):
    proposedDailyRate = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    proposedTerms = serializers.CharField(required=False, allow_blank=True)
    note = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        contract: Contract = self.context["contract"]

        if contract.status not in ["Published", "In Negotiation"]:
            raise serializers.ValidationError("Offers can only be submitted for Published or In Negotiation contracts.")

        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        contract: Contract = self.context["contract"]

        offer = ContractOffer.objects.create(
            contract=contract,
            provider=request.user.provider,
            created_by=request.user,
            status="Submitted",
            proposed_daily_rate=validated_data.get("proposedDailyRate", None),
            proposed_terms=validated_data.get("proposedTerms", ""),
            note=validated_data.get("note", ""),
        )
        log_activity(
            provider_id=request.user.provider_id,
            actor_type="USER",
            actor_user=request.user,
            event_type="CONTRACT_OFFER_SUBMITTED",
            entity_type="ContractOffer",
            entity_id=offer.id,
            message=f"Submitted contract offer for contract {contract.id}",
            metadata={
                "contractId": contract.id,
                "status": offer.status,
                "providerId": request.user.provider_id,
            },
        )

        # Optional: once any offer exists, mark contract as In Negotiation
        if contract.status == "Published":
            contract.status = "In Negotiation"
            contract.save(update_fields=["status"])

        return offer
