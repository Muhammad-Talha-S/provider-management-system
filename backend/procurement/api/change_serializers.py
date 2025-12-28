from __future__ import annotations

from rest_framework import serializers
from django.utils.dateparse import parse_date

from procurement.models import ServiceOrderChangeRequest, ServiceOrder
from providers.models import Specialist


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
    """
    Supplier Rep initiates substitution.
    """
    new_specialist_id = serializers.UUIDField()
    reason = serializers.CharField(required=False, allow_blank=True)

    def validate_new_specialist_id(self, value):
        if not Specialist.objects.filter(id=value).exists():
            raise serializers.ValidationError("Specialist not found.")
        return value


class PMExtensionCreateSerializer(serializers.Serializer):
    """
    PM initiates extension.
    """
    new_end_date = serializers.DateField()
    additional_man_days = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(required=False, allow_blank=True)


class PMSubstitutionCreateSerializer(serializers.Serializer):
    """
    PM initiates substitution (optional for testing).
    """
    new_specialist_id = serializers.UUIDField()
    reason = serializers.CharField(required=False, allow_blank=True)

    def validate_new_specialist_id(self, value):
        if not Specialist.objects.filter(id=value).exists():
            raise serializers.ValidationError("Specialist not found.")
        return value


class ChangeDecisionSerializer(serializers.Serializer):
    """
    Accept/reject payload if you want to include a note.
    """
    note = serializers.CharField(required=False, allow_blank=True)
