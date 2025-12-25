from __future__ import annotations

from rest_framework import serializers
from accounts.models import ProviderUser, RoleDefinition, UserRoleAssignment


class ProviderMiniSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()


class MeSerializer(serializers.ModelSerializer):
    provider = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()

    class Meta:
        model = ProviderUser
        fields = ["id", "email", "full_name", "provider", "roles"]

    def get_provider(self, obj: ProviderUser):
        if not obj.provider:
            return None
        return {"id": obj.provider.id, "name": obj.provider.name}

    def get_roles(self, obj: ProviderUser):
        return sorted(list(obj.active_role_names()))


class ProviderUserListSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()

    class Meta:
        model = ProviderUser
        fields = ["id", "email", "full_name", "is_active", "roles", "created_at"]

    def get_roles(self, obj: ProviderUser):
        return sorted(list(obj.active_role_names()))


class RoleAssignSerializer(serializers.Serializer):
    role_name = serializers.CharField(max_length=120)
    domain = serializers.CharField(max_length=120, required=False, allow_blank=True)
    group_name = serializers.CharField(max_length=120, required=False, allow_blank=True)

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
