from __future__ import annotations

import uuid
from django.db import models


class Provider(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(max_length=255)
    legal_name = models.CharField(max_length=255, blank=True, null=True)
    tax_id = models.CharField(max_length=120, blank=True, null=True)

    country = models.CharField(max_length=100, blank=True, null=True)
    address = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.name


class Specialist(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    provider = models.ForeignKey(Provider, on_delete=models.CASCADE, related_name="specialists")

    full_name = models.CharField(max_length=255)
    material_number = models.CharField(max_length=120, blank=True, null=True)

    performance_grade = models.DecimalField(max_digits=3, decimal_places=2, blank=True, null=True)
    avg_daily_rate_eur = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["provider"])]
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "material_number"],
                name="uniq_specialist_material_per_provider",
            )
        ]

    def __str__(self) -> str:
        return f"{self.full_name} ({self.provider.name})"


class SpecialistRoleCapability(models.Model):
    """
    Optional but useful for matching/validation:
    which Specialist can do which role at which level.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    specialist = models.ForeignKey(Specialist, on_delete=models.CASCADE, related_name="role_capabilities")
    role_definition = models.ForeignKey(
        "accounts.RoleDefinition", on_delete=models.PROTECT, related_name="specialist_caps"
    )

    experience_level = models.CharField(max_length=20, choices=[
        ("JUNIOR", "Junior"),
        ("INTERMEDIATE", "Intermediate"),
        ("SENIOR", "Senior"),
    ])
    technology_level = models.CharField(max_length=20, choices=[
        ("COMMON", "Common"),
        ("UNCOMMON", "Uncommon"),
        ("RARE", "Rare"),
    ])

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["specialist", "role_definition", "experience_level", "technology_level"],
                name="uniq_specialist_role_level",
            )
        ]
