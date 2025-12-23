from __future__ import annotations

import uuid
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager


class ProviderUserManager(BaseUserManager):
    def create_user(self, email: str, password: str | None = None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)

        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self.create_user(email=email, password=password, **extra_fields)


class ProviderUser(AbstractBaseUser, PermissionsMixin):
    """
    Tenant user: belongs to a Provider.
    Authorization is custom RBAC via UserRoleAssignment.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    provider = models.ForeignKey(
        "providers.Provider",
        on_delete=models.PROTECT,
        related_name="users",
        null=True,
        blank=True,
    )

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = ["full_name"]

    objects = ProviderUserManager()

    def __str__(self) -> str:
        return f"{self.email} ({self.full_name})"

    def active_role_names(self) -> set[str]:
        now = timezone.now()
        qs = (
            self.role_assignments.select_related("role_definition")
            .filter(status=UserRoleAssignment.Status.ACTIVE)
            .filter(valid_from__lte=now)
            .filter(models.Q(valid_to__isnull=True) | models.Q(valid_to__gt=now))
        )
        return {x.role_definition.name for x in qs}

    def has_active_role(self, role_name: str) -> bool:
        return role_name in self.active_role_names()


class RoleDefinition(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(max_length=120)  # e.g., Supplier Representative
    domain = models.CharField(max_length=120, blank=True, null=True)
    group_name = models.CharField(max_length=120, blank=True, null=True)

    validation_rules = models.JSONField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["name", "domain", "group_name"],
                name="uniq_roledef_name_domain_group",
            )
        ]

    def __str__(self) -> str:
        return " / ".join([p for p in [self.name, self.domain, self.group_name] if p])


class UserRoleAssignment(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        REVOKED = "REVOKED", "Revoked"

    class ExperienceLevel(models.TextChoices):
        JUNIOR = "JUNIOR", "Junior"
        INTERMEDIATE = "INTERMEDIATE", "Intermediate"
        SENIOR = "SENIOR", "Senior"

    class TechnologyLevel(models.TextChoices):
        COMMON = "COMMON", "Common"
        UNCOMMON = "UNCOMMON", "Uncommon"
        RARE = "RARE", "Rare"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        ProviderUser, on_delete=models.CASCADE, related_name="role_assignments"
    )
    role_definition = models.ForeignKey(
        RoleDefinition, on_delete=models.PROTECT, related_name="assignments"
    )

    experience_level = models.CharField(
        max_length=20, choices=ExperienceLevel.choices, blank=True, null=True
    )
    technology_level = models.CharField(
        max_length=20, choices=TechnologyLevel.choices, blank=True, null=True
    )

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)

    valid_from = models.DateTimeField(default=timezone.now)
    valid_to = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["role_definition"]),
            models.Index(fields=["user", "role_definition", "status"]),
        ]

    def revoke(self, revoked_at=None):
        revoked_at = revoked_at or timezone.now()
        self.status = self.Status.REVOKED
        self.valid_to = revoked_at
        self.save(update_fields=["status", "valid_to"])

    def __str__(self) -> str:
        return f"{self.user.email} -> {self.role_definition.name} ({self.status})"


class RoleRatePolicy(models.Model):
    """
    Your 'Maximum Price' matrix:
    (role_definition + experience_level + technology_level) -> max_daily_rate_eur
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    role_definition = models.ForeignKey(
        RoleDefinition, on_delete=models.PROTECT, related_name="rate_policies"
    )
    experience_level = models.CharField(max_length=20, choices=UserRoleAssignment.ExperienceLevel.choices)
    technology_level = models.CharField(max_length=20, choices=UserRoleAssignment.TechnologyLevel.choices)

    max_daily_rate_eur = models.DecimalField(max_digits=10, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["role_definition", "experience_level", "technology_level"],
                name="uniq_rate_policy_matrix",
            )
        ]

    def __str__(self) -> str:
        return f"{self.role_definition.name} {self.experience_level}/{self.technology_level} <= {self.max_daily_rate_eur}"
