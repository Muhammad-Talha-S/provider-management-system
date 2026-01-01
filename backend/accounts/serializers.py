from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    providerId = serializers.CharField(source="provider_id")

    class Meta:
        model = User
        fields = [
            "id", "name", "email",
            "role", "providerId",
            "status", "created_at",

            "photo", "material_number",
            "experience_level", "technology_level",
            "performance_grade", "average_daily_rate",
            "skills", "availability",
            "service_requests_completed", "service_orders_active",
        ]


class UserRoleUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["role"]

    def validate_role(self, value):
        allowed = {"Provider Admin", "Supplier Representative", "Contract Coordinator", "Specialist"}
        if value not in allowed:
            raise serializers.ValidationError("Invalid role.")
        return value
