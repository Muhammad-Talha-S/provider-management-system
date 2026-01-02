from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    providerId = serializers.CharField(source="provider_id", read_only=True)
    createdAt = serializers.DateField(source="created_at", read_only=True)

    materialNumber = serializers.CharField(source="material_number", required=False, allow_null=True, allow_blank=True)
    experienceLevel = serializers.CharField(source="experience_level", required=False, allow_null=True)
    technologyLevel = serializers.CharField(source="technology_level", required=False, allow_null=True)
    performanceGrade = serializers.CharField(source="performance_grade", required=False, allow_null=True)
    averageDailyRate = serializers.DecimalField(source="average_daily_rate", max_digits=10, decimal_places=2, required=False, allow_null=True)

    serviceRequestsCompleted = serializers.IntegerField(source="service_requests_completed", required=False, allow_null=True)
    serviceOrdersActive = serializers.IntegerField(source="service_orders_active", required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            "id", "name", "email",
            "role", "providerId",
            "status", "createdAt",
            "photo",
            "materialNumber",
            "experienceLevel", "technologyLevel",
            "performanceGrade", "averageDailyRate",
            "skills", "availability",
            "serviceRequestsCompleted", "serviceOrdersActive",
        ]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    materialNumber = serializers.CharField(source="material_number", required=False, allow_null=True, allow_blank=True)
    experienceLevel = serializers.CharField(source="experience_level", required=False, allow_null=True)
    technologyLevel = serializers.CharField(source="technology_level", required=False, allow_null=True)
    performanceGrade = serializers.CharField(source="performance_grade", required=False, allow_null=True)
    averageDailyRate = serializers.DecimalField(source="average_daily_rate", max_digits=10, decimal_places=2, required=False, allow_null=True)

    serviceRequestsCompleted = serializers.IntegerField(source="service_requests_completed", required=False, allow_null=True)
    serviceOrdersActive = serializers.IntegerField(source="service_orders_active", required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            "id", "name", "email", "password",
            "role", "status",
            "photo", "materialNumber",
            "experienceLevel", "technologyLevel",
            "performanceGrade", "averageDailyRate",
            "skills", "availability",
            "serviceRequestsCompleted", "serviceOrdersActive",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserRoleUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["role"]
