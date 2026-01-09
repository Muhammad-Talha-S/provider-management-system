from .models import ActivityLog

def log_activity(
    *,
    provider_id: str | None,
    actor_type: str,
    actor_user=None,
    event_type: str,
    entity_type: str,
    entity_id: str,
    message: str = "",
    metadata: dict | None = None,
):
    ActivityLog.objects.create(
        provider_id=provider_id,
        actor_type=actor_type,
        actor_user=actor_user,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=str(entity_id),
        message=message,
        metadata=metadata or None,
    )
