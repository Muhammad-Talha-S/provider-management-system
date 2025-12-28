from procurement.models import ActivityLog

def log_action(*, provider_id, actor_user_id, action, entity_type=None, entity_id=None, details=None):
    ActivityLog.objects.create(
        provider_id=provider_id,
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details or {},
    )
