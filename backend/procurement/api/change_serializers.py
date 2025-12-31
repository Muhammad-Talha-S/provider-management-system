from __future__ import annotations

from rest_framework import serializers
from procurement.models import ServiceOrderChangeRequest
from accounts.models import ProviderUser


class ChangeRequestListSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceOrderChangeRequest
        fields = [
            "id",
            "service_order",
            "change_type",
            "initiated_by_type",
            "initiated_by_user",
            "initiated_by_external_id",
            "payload",
            "status",
            "created_at",
            "updated_at",
        ]


class SupplierSubstitutionCreateSerializer(serializers.Serializer):
    new_specialist_user_id = serializers.UUIDField()
    reason = serializers.CharField(required=False, allow_blank=True)

    def validate_new_specialist_user_id(self, value):
        if not ProviderUser.objects.filter(id=value).exists():
            raise serializers.ValidationError("User not found.")
        return value


class PMExtensionCreateSerializer(serializers.Serializer):
    new_end_date = serializers.DateField()
    additional_man_days = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(required=False, allow_blank=True)


class ChangeDecisionSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True)
