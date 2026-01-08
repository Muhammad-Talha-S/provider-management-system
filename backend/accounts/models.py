from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from providers.models import Provider

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)  # hashes password
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ("Provider Admin", "Provider Admin"),
        ("Supplier Representative", "Supplier Representative"),
        ("Contract Coordinator", "Contract Coordinator"),
        ("Specialist", "Specialist"),
    ]
    STATUS_CHOICES = [("Active", "Active"), ("Inactive", "Inactive")]
    EXP_CHOICES = [("Junior","Junior"),("Mid","Mid"),("Senior","Senior"),("Expert","Expert")]
    TECH_CHOICES = [("Basic","Basic"),("Intermediate","Intermediate"),("Advanced","Advanced"),("Expert","Expert")]
    GRADE_CHOICES = [("A","A"),("B","B"),("C","C"),("D","D")]
    AVAIL_CHOICES = [("Available","Available"),("Partially Booked","Partially Booked"),("Fully Booked","Fully Booked")]

    # Frontend uses ids like U001 / SP001 — keep it
    id = models.CharField(primary_key=True, max_length=20)

    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)

    role = models.CharField(max_length=30, choices=ROLE_CHOICES)
    provider = models.ForeignKey(Provider, on_delete=models.PROTECT, related_name="users")

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="Active")
    created_at = models.DateField()

    # Specialist fields (nullable)
    photo = models.URLField(blank=True, null=True)
    material_number = models.CharField(max_length=50, blank=True, null=True)

    experience_level = models.CharField(max_length=10, choices=EXP_CHOICES, blank=True, null=True)
    technology_level = models.CharField(max_length=15, choices=TECH_CHOICES, blank=True, null=True)
    performance_grade = models.CharField(max_length=1, choices=GRADE_CHOICES, blank=True, null=True)
    average_daily_rate = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    # Store list of skills as JSON (Postgres friendly)
    skills = models.JSONField(blank=True, null=True)
    availability = models.CharField(max_length=20, choices=AVAIL_CHOICES, blank=True, null=True)

    service_requests_completed = models.IntegerField(blank=True, null=True)
    service_orders_active = models.IntegerField(blank=True, null=True)

    # Django auth flags
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name", "id"]

    objects = UserManager()

    def __str__(self):
        return f"{self.email} ({self.role})"
