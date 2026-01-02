from rest_framework import serializers
from .models import Provider

class ProviderSerializer(serializers.ModelSerializer):
    communicationPreferences = serializers.SerializerMethodField()
    metrics = serializers.SerializerMethodField()

    class Meta:
        model = Provider
        fields = [
            "id", "name",
            "contact_name", "contact_email", "contact_phone", "address",
            "communicationPreferences", "metrics",
            "status", "created_at",
        ]

    def get_communicationPreferences(self, obj):
        return {
            "emailNotifications": obj.email_notifications,
            "smsNotifications": obj.sms_notifications,
            "preferredLanguage": obj.preferred_language,
        }

    def get_metrics(self, obj):
        # For Milestone 1: return zeros or lightweight counts
        # Later, compute from related objects (contracts/orders/etc).
        return {
            "totalUsers": obj.users.count(),
            "activeSpecialists": obj.users.filter(role="Specialist", status="Active").count(),
            "activeServiceOrders": 0,
            "activeContracts": 0,
        }


class ProviderSerializer(serializers.ModelSerializer):
    contactName = serializers.CharField(source="contact_name")
    contactEmail = serializers.EmailField(source="contact_email")
    contactPhone = serializers.CharField(source="contact_phone")
    createdAt = serializers.DateField(source="created_at")

    communicationPreferences = serializers.SerializerMethodField()
    metrics = serializers.SerializerMethodField()

    class Meta:
        model = Provider
        fields = [
            "id", "name",
            "contactName", "contactEmail", "contactPhone",
            "address",
            "communicationPreferences",
            "metrics",
            "status",
            "createdAt",
        ]

    def get_communicationPreferences(self, obj):
        return {
            "emailNotifications": obj.email_notifications,
            "smsNotifications": obj.sms_notifications,
            "preferredLanguage": obj.preferred_language,
        }

    def get_metrics(self, obj):
        return {
            "totalUsers": obj.users.count(),
            "activeSpecialists": obj.users.filter(role="Specialist", status="Active").count(),
            "activeServiceOrders": 0,
            "activeContracts": 0,
        }


class ProviderUpdateSerializer(serializers.ModelSerializer):
    contactName = serializers.CharField(source="contact_name", required=False)
    contactEmail = serializers.EmailField(source="contact_email", required=False)
    contactPhone = serializers.CharField(source="contact_phone", required=False)

    communicationPreferences = serializers.DictField(required=False)

    class Meta:
        model = Provider
        fields = [
            "name", "contactName", "contactEmail", "contactPhone",
            "address", "communicationPreferences", "status"
        ]

    def update(self, instance, validated_data):
        comm = validated_data.pop("communicationPreferences", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)

        if comm:
            instance.email_notifications = comm.get("emailNotifications", instance.email_notifications)
            instance.sms_notifications = comm.get("smsNotifications", instance.sms_notifications)
            instance.preferred_language = comm.get("preferredLanguage", instance.preferred_language)

        instance.save()
        return instance
