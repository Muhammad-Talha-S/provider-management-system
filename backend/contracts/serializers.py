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
    deltas = serializers.JSONField(allow_null=True, required=False)

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
            "deltas",
            "createdAt",
            "submittedAt",
        ]


class ContractOfferCreateSerializer(serializers.Serializer):
    requestSnapshot = serializers.JSONField(required=False, allow_null=True)
    response = serializers.JSONField(required=False, allow_null=True)
    deltas = serializers.JSONField(required=False, allow_null=True)
    note = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    status = serializers.ChoiceField(choices=["DRAFT", "SUBMITTED"], default="SUBMITTED")

    def validate(self, attrs):
        contract: Contract = self.context["contract"]
        if contract.status not in ["PUBLISHED", "IN_NEGOTIATION"]:
            raise serializers.ValidationError("Contract is not open for offers.")
        return attrs

    def create(self, validated_data):
        req = self.context["request"]
        contract: Contract = self.context["contract"]

        snapshot = validated_data.get("requestSnapshot")
        if snapshot is None:
            # store Group2 snapshot for traceability
            snapshot = contract.external_snapshot or {}

        offer = ContractOffer.objects.create(
            contract=contract,
            provider=req.user.provider,
            created_by_user_id=getattr(req.user, "id", None),
            request_snapshot=snapshot,
            response=validated_data.get("response"),
            deltas=validated_data.get("deltas") or [],
            note=validated_data.get("note") or "",
            status=validated_data.get("status", "SUBMITTED"),
        )
        return offer


class Group2ProviderStatusSerializer(serializers.Serializer):
    providerId = serializers.CharField()
    status = serializers.ChoiceField(choices=["IN_NEGOTIATION", "ACTIVE", "EXPIRED"])
    note = serializers.CharField(required=False, allow_blank=True, allow_null=True)
