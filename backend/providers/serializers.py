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
