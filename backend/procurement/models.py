from django.db import models
from django.conf import settings


class ServiceRequest(models.Model):
    STATUS_CHOICES = [("Open", "Open"), ("Closed", "Closed")]
    TYPE_CHOICES = [
        ("Single", "Single"),
        ("Multi", "Multi"),
        ("Team", "Team"),
        ("Work Contract", "Work Contract"),
    ]

    id = models.CharField(primary_key=True, max_length=20)  # e.g. SR001
    title = models.CharField(max_length=255)

    type = models.CharField(max_length=30, choices=TYPE_CHOICES, default="Single")

    # Milestone 4: SR must reference a contract id (from contracts.Contract)
    linked_contract_id = models.CharField(max_length=20)

    # Milestone 5: computed from contract.allowed_request_configs[type].offerDeadlineDays
    offer_deadline_at = models.DateTimeField(null=True, blank=True)

    # Milestone 5: store cycles from contract.allowed_request_configs[type].cycles
    cycles = models.PositiveSmallIntegerField(null=True, blank=True)

    role = models.CharField(max_length=120)
    technology = models.CharField(max_length=255, blank=True, default="")
    experience_level = models.CharField(max_length=50, blank=True, default="")

    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    total_man_days = models.PositiveIntegerField(default=0)
    onsite_days = models.PositiveIntegerField(default=0)

    performance_location = models.CharField(max_length=50, blank=True, default="Onshore")

    required_languages = models.JSONField(default=list, blank=True)
    must_have_criteria = models.JSONField(default=list, blank=True)
    nice_to_have_criteria = models.JSONField(default=list, blank=True)

    task_description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="Open")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.id} - {self.title}"


class ServiceOffer(models.Model):
    STATUS_CHOICES = [
        ("Draft", "Draft"),
        ("Submitted", "Submitted"),
        ("Withdrawn", "Withdrawn"),
        ("Accepted", "Accepted"),
        ("Rejected", "Rejected"),
    ]
    REL_CHOICES = [("Employee", "Employee"), ("Freelancer", "Freelancer"), ("Subcontractor", "Subcontractor")]

    id = models.AutoField(primary_key=True)

    service_request = models.ForeignKey(ServiceRequest, on_delete=models.CASCADE, related_name="offers")
    provider = models.ForeignKey("providers.Provider", on_delete=models.CASCADE, related_name="service_offers")

    specialist = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="service_offers_as_specialist",
        limit_choices_to={"role": "Specialist"},
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="service_offers_created",
    )

    daily_rate = models.DecimalField(max_digits=10, decimal_places=2)
    travel_cost_per_onsite_day = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2)

    contractual_relationship = models.CharField(max_length=30, choices=REL_CHOICES, default="Employee")
    subcontractor_company = models.CharField(max_length=255, null=True, blank=True)

    must_have_match_percentage = models.PositiveIntegerField(null=True, blank=True)
    nice_to_have_match_percentage = models.PositiveIntegerField(null=True, blank=True)

    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="Draft")
    submitted_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Offer {self.id} for {self.service_request_id}"


class ServiceOrder(models.Model):
    STATUS_CHOICES = [("Active", "Active"), ("Completed", "Completed")]

    id = models.AutoField(primary_key=True)

    service_offer = models.OneToOneField(ServiceOffer, on_delete=models.CASCADE, related_name="service_order")
    service_request = models.ForeignKey(ServiceRequest, on_delete=models.PROTECT, related_name="service_orders")

    provider = models.ForeignKey("providers.Provider", on_delete=models.CASCADE, related_name="service_orders")
    specialist = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="service_orders_as_specialist",
        limit_choices_to={"role": "Specialist"},
    )

    title = models.CharField(max_length=255)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    location = models.CharField(max_length=50, blank=True, default="Onshore")
    man_days = models.PositiveIntegerField(default=0)

    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="Active")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order {self.id} ({self.provider_id})"


class ServiceOrderChangeRequest(models.Model):
    TYPE_CHOICES = [("Extension", "Extension"), ("Substitution", "Substitution")]
    STATUS_CHOICES = [("Requested", "Requested"), ("Approved", "Approved"), ("Declined", "Declined")]

    id = models.AutoField(primary_key=True)
    service_order = models.ForeignKey(ServiceOrder, on_delete=models.CASCADE, related_name="change_requests")
    provider = models.ForeignKey("providers.Provider", on_delete=models.CASCADE, related_name="service_order_change_requests")

    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Requested")

    created_by_system = models.BooleanField(default=False)
    created_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="service_order_change_requests_created"
    )
    decided_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="service_order_change_requests_decided"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)

    reason = models.TextField(blank=True, default="")
    provider_response_note = models.TextField(blank=True, default="")

    new_end_date = models.DateField(null=True, blank=True)
    additional_man_days = models.PositiveIntegerField(null=True, blank=True)
    new_total_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    old_specialist = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="service_order_change_requests_old_specialist",
    )
    new_specialist = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="service_order_change_requests_new_specialist",
    )

    def __str__(self):
        return f"ChangeRequest {self.id} ({self.type}) for Order {self.service_order_id}"
