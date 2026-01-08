from django.db import models
from django.conf import settings

class ActivityLog(models.Model):
    ACTOR_CHOICES = [
        ("USER", "USER"),
        ("GROUP3_SYSTEM", "GROUP3_SYSTEM"),
        ("SYSTEM", "SYSTEM"),
    ]

    provider = models.ForeignKey(
        "providers.Provider",
        on_delete=models.CASCADE,
        related_name="activity_logs",
        null=True,
        blank=True,
    )

    actor_type = models.CharField(max_length=20, choices=ACTOR_CHOICES, default="USER")
    actor_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activity_logs",
    )

    event_type = models.CharField(max_length=80)

    entity_type = models.CharField(max_length=50)  # "User", "Provider", "ServiceRequest", ...
    entity_id = models.CharField(max_length=50)    # "U001", "P001", "SR001", "12", ...

    message = models.TextField(blank=True, default="")
    metadata = models.JSONField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.event_type} [{self.entity_type}:{self.entity_id}]"
