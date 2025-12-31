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
    Everyone is a user (employee) inside a Provider.
    System access is controlled by SYSTEM roles (Specialist, Provider Admin, Supplier Rep, Contract Coordinator).
    Job capability is controlled by JOB roles (Backend Django Developer, Data Engineer, ...).
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

    # Used for "activate/deactivate employee"
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = ["full_name"]

    objects = ProviderUserManager()

    def __str__(self) -> str:
        return f"{self.email} ({self.full_name})"

    def _active_assignments_qs(self):
        now = timezone.now()
        return (
            self.role_assignments.select_related("role_definition")
            .filter(status=UserRoleAssignment.Status.ACTIVE)
            .filter(valid_from__lte=now)
            .filter(models.Q(valid_to__isnull=True) | models.Q(valid_to__gt=now))
        )

    def active_system_role_names(self) -> set[str]:
        return {
            x.role_definition.name
            for x in self._active_assignments_qs().filter(role_definition__role_type=RoleDefinition.RoleType.SYSTEM)
        }

    def active_job_role_names(self) -> set[str]:
        return {
            x.role_definition.name
            for x in self._active_assignments_qs().filter(role_definition__role_type=RoleDefinition.RoleType.JOB)
        }

    def has_system_role(self, role_name: str) -> bool:
        return role_name in self.active_system_role_names()

    def has_job_role(self, role_name: str) -> bool:
        return role_name in self.active_job_role_names()

    def active_role_names(self) -> set[str]:
        # kept for backward compatibility (returns both types)
        return {x.role_definition.name for x in self._active_assignments_qs()}


class RoleDefinition(models.Model):
    class RoleType(models.TextChoices):
        SYSTEM = "SYSTEM", "System"
        JOB = "JOB", "Job"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Example SYSTEM: Specialist, Provider Admin, Supplier Representative, Contract Coordinator
    # Example JOB: Backend Django Developer, Full Stack Developer, Data Engineer, Frontend Developer
    role_type = models.CharField(max_length=10, choices=RoleType.choices, default=RoleType.SYSTEM)

    name = models.CharField(max_length=120)
    domain = models.CharField(max_length=120, blank=True, null=True)
    group_name = models.CharField(max_length=120, blank=True, null=True)

    validation_rules = models.JSONField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["role_type", "name", "domain", "group_name"],
                name="uniq_roledef_type_name_domain_group",
            )
        ]

    def __str__(self) -> str:
        prefix = self.role_type
        parts = [self.name, self.domain, self.group_name]
        return f"{prefix}: " + " / ".join([p for p in parts if p])


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

    # For JOB roles (capability)
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
        return f"{self.user.email} -> {self.role_definition} ({self.status})"


class SpecialistProfile(models.Model):
    """
    Specialist is not a separate user; it's a role.
    Specialist-only attributes live here.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.OneToOneField(
        ProviderUser, on_delete=models.CASCADE, related_name="specialist_profile"
    )

    material_number = models.CharField(max_length=120, blank=True, null=True)
    performance_grade = models.DecimalField(max_digits=3, decimal_places=2, blank=True, null=True)
    avg_daily_rate_eur = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    # If you want to deactivate employee, use ProviderUser.is_active (not here)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user"], name="uniq_specialist_profile_user")
        ]

    def __str__(self) -> str:
        return f"SpecialistProfile({self.user.email})"


class RoleRatePolicy(models.Model):
    """
    Maximum price matrix for JOB roles only:
    (job_role + experience_level + technology_level) -> max_daily_rate_eur
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
        return f"{self.role_definition} {self.experience_level}/{self.technology_level} <= {self.max_daily_rate_eur}"
