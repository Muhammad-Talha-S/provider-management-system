from rest_framework import serializers
from .models import Contract, ContractOffer, ContractProviderStatus


class ContractSerializer(serializers.ModelSerializer):
    contractId = serializers.CharField(source="id")
    publishingDate = serializers.DateField(source="publishing_date", allow_null=True, required=False)
    offerDeadlineAt = serializers.DateTimeField(source="offer_deadline_at", allow_null=True, required=False)

    scopeOfWork = serializers.CharField(source="scope_of_work", required=False, allow_blank=True)
    termsAndConditions = serializers.CharField(source="terms_and_conditions", required=False, allow_blank=True)

    allowedConfiguration = serializers.JSONField(source="config", allow_null=True, required=False)
    stakeholders = serializers.JSONField(allow_null=True, required=False)
    weighting = serializers.JSONField(allow_null=True, required=False)
    versionsAndDocuments = serializers.JSONField(source="versions_and_documents", allow_null=True, required=False)

    isAwardedToMyProvider = serializers.SerializerMethodField()
    myProviderStatus = serializers.SerializerMethodField()

    class Meta:
        model = Contract
        fields = [
            "contractId",
            "title",
            "kind",
            "status",
            "publishingDate",
            "offerDeadlineAt",
            "stakeholders",
            "scopeOfWork",
            "termsAndConditions",
            "weighting",
            "allowedConfiguration",
            "versionsAndDocuments",
            "isAwardedToMyProvider",
            "myProviderStatus",
        ]

    def get_isAwardedToMyProvider(self, obj: Contract):
        req = self.context.get("request")
        if not req or not getattr(req.user, "provider_id", None):
            return False
        return ContractProviderStatus.objects.filter(contract=obj, provider_id=req.user.provider_id, status="ACTIVE").exists()

    def get_myProviderStatus(self, obj: Contract):
        req = self.context.get("request")
        if not req or not getattr(req.user, "provider_id", None):
            return None
        cps = ContractProviderStatus.objects.filter(contract=obj, provider_id=req.user.provider_id).first()
        if not cps:
            return None
        return {
            "status": cps.status,
            "awardedAt": cps.awarded_at.isoformat() if cps.awarded_at else None,
            "note": cps.note,
        }


class ContractOfferSerializer(serializers.ModelSerializer):
    contractId = serializers.CharField(source="contract_id")
    providerId = serializers.CharField(source="provider_id")

    requestSnapshot = serializers.JSONField(source="request_snapshot", allow_null=True, required=False)
    response = serializers.JSONField(allow_null=True, required=False)

    createdAt = serializers.DateTimeField(source="created_at")
    submittedAt = serializers.DateTimeField(source="submitted_at", allow_null=True, required=False)

    class Meta:
        model = ContractOffer
        fields = [
            "id",
            "contractId",
            "providerId",
            "status",
            "note",
            "requestSnapshot",
            "response",
            "createdAt",
            "submittedAt",
        ]


class ContractOfferCreateSerializer(serializers.Serializer):
    """
    New simplified offer submission (NO deltas).

    Client sends:
      proposedPricingRules: same object shape as contract.allowedConfiguration.pricingRules
      note (optional)
      status: DRAFT|SUBMITTED (default SUBMITTED)

    Server derives:
      providerName/providerEmail/category (category is hardcoded to "IT Service")
    """

    proposedPricingRules = serializers.JSONField(required=True)
    note = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    status = serializers.ChoiceField(choices=["DRAFT", "SUBMITTED"], default="SUBMITTED")

    def validate(self, attrs):
        contract: Contract = self.context["contract"]
        if contract.status not in ["PUBLISHED", "IN_NEGOTIATION", "ACTIVE"]:
            raise serializers.ValidationError("Contract is not open for offers.")

        pr = attrs.get("proposedPricingRules")
        if not isinstance(pr, dict):
            raise serializers.ValidationError("proposedPricingRules must be an object.")

        if "currency" not in pr:
            raise serializers.ValidationError("proposedPricingRules.currency is required.")
        if "maxDailyRates" not in pr or not isinstance(pr.get("maxDailyRates"), list):
            raise serializers.ValidationError("proposedPricingRules.maxDailyRates must be a list.")

        # Enforce currency stays the same as original contract pricingRules (if present)
        original_currency = None
        try:
            original_currency = (contract.config or {}).get("pricingRules", {}).get("currency")
        except Exception:
            original_currency = None

        if original_currency and pr.get("currency") != original_currency:
            raise serializers.ValidationError(
                f"Currency must remain '{original_currency}' (same as original contract)."
            )

        # Minimal numeric sanity checks for maxDailyRate
        for i, row in enumerate(pr.get("maxDailyRates") or []):
            if not isinstance(row, dict):
                raise serializers.ValidationError(f"maxDailyRates[{i}] must be an object.")
            if "maxDailyRate" not in row:
                raise serializers.ValidationError(f"maxDailyRates[{i}].maxDailyRate is required.")
            try:
                val = float(row.get("maxDailyRate"))
            except Exception:
                raise serializers.ValidationError(f"maxDailyRates[{i}].maxDailyRate must be numeric.")
            if val < 0:
                raise serializers.ValidationError(f"maxDailyRates[{i}].maxDailyRate must be >= 0.")

        return attrs


class Group2ProviderStatusSerializer(serializers.Serializer):
    providerId = serializers.CharField()
    status = serializers.ChoiceField(choices=["IN_NEGOTIATION", "ACTIVE", "EXPIRED"])
    note = serializers.CharField(required=False, allow_blank=True, allow_null=True)
