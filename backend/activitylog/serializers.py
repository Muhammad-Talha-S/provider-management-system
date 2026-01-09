from rest_framework import serializers
from .models import ActivityLog

class ActivityLogSerializer(serializers.ModelSerializer):
    providerId = serializers.CharField(source="provider_id", allow_null=True, read_only=True)
    actorUserId = serializers.CharField(source="actor_user_id", allow_null=True, read_only=True)
    actorUserName = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = [
            "id",
            "providerId",
            "actor_type",
            "actorUserId",
            "actorUserName",
            "event_type",
            "entity_type",
            "entity_id",
            "message",
            "metadata",
            "created_at",
        ]

    def get_actorUserName(self, obj):
        if obj.actor_user:
            return obj.actor_user.name
        return None
