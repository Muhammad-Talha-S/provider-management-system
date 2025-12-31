from __future__ import annotations

from rest_framework import serializers
from accounts.models import ProviderUser, SpecialistProfile, UserRoleAssignment


class MeSerializer(serializers.ModelSerializer):
    provider = serializers.SerializerMethodField()
    system_roles = serializers.SerializerMethodField()
    job_roles = serializers.SerializerMethodField()
    specialist_profile = serializers.SerializerMethodField()

    class Meta:
        model = ProviderUser
        fields = ["id", "email", "full_name", "is_active", "provider", "system_roles", "job_roles", "specialist_profile"]

    def get_provider(self, obj: ProviderUser):
        if not obj.provider:
            return None
        return {"id": obj.provider.id, "name": obj.provider.name}

    def get_system_roles(self, obj: ProviderUser):
        return sorted(list(obj.active_system_role_names()))

    def get_job_roles(self, obj: ProviderUser):
        return sorted(list(obj.active_job_role_names()))

    def get_specialist_profile(self, obj: ProviderUser):
        if not hasattr(obj, "specialist_profile"):
            return None
        sp: SpecialistProfile = obj.specialist_profile
        return {
            "material_number": sp.material_number,
            "performance_grade": sp.performance_grade,
            "avg_daily_rate_eur": sp.avg_daily_rate_eur,
        }


class ProviderUserListSerializer(serializers.ModelSerializer):
    system_roles = serializers.SerializerMethodField()
    job_roles = serializers.SerializerMethodField()

    class Meta:
        model = ProviderUser
        fields = ["id", "email", "full_name", "is_active", "system_roles", "job_roles", "created_at"]

    def get_system_roles(self, obj: ProviderUser):
        return sorted(list(obj.active_system_role_names()))

    def get_job_roles(self, obj: ProviderUser):
        return sorted(list(obj.active_job_role_names()))


class RoleAssignSerializer(serializers.Serializer):
    role_name = serializers.CharField(max_length=120)
    domain = serializers.CharField(max_length=120, required=False, allow_blank=True)
    group_name = serializers.CharField(max_length=120, required=False, allow_blank=True)

    # For JOB roles (capability)
    experience_level = serializers.ChoiceField(
        choices=UserRoleAssignment.ExperienceLevel.choices,
        required=False,
        allow_null=True,
    )
    technology_level = serializers.ChoiceField(
        choices=UserRoleAssignment.TechnologyLevel.choices,
        required=False,
        allow_null=True,
    )


class RoleRevokeSerializer(serializers.Serializer):
    role_name = serializers.CharField(max_length=120)
    domain = serializers.CharField(max_length=120, required=False, allow_blank=True)
    group_name = serializers.CharField(max_length=120, required=False, allow_blank=True)


class MeProfilePatchSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255, required=False)

    # specialist profile fields (optional editable)
    performance_grade = serializers.DecimalField(max_digits=3, decimal_places=2, required=False)
    avg_daily_rate_eur = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
