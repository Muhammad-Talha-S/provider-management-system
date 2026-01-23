from django.db import models
from django.conf import settings
from decimal import Decimal

class ServiceRequest(models.Model):
    """
    Pulled from Group3.
    We store:
      - id = requestNumber
      - external_payload = raw Group3 payload
      - contract_id (hardcoded C003 for now in upsert)
    """

    id = models.CharField(primary_key=True, max_length=50)  # requestNumber, e.g. SR-000024
    external_id = models.IntegerField(null=True, blank=True)

    request_number = models.CharField(max_length=50, blank=True, default="")
    title = models.CharField(max_length=255, blank=True, default="")

    type = models.CharField(max_length=30, blank=True, default="SINGLE")  # SINGLE|MULTI|TEAM|WORK_CONTRACT
    status = models.CharField(max_length=50, blank=True, default="DRAFT")

    contract_id = models.CharField(max_length=50, blank=True, default="")
    contract_supplier = models.CharField(max_length=255, blank=True, default="")

    project_id = models.CharField(max_length=50, blank=True, default="")
    project_name = models.CharField(max_length=255, blank=True, default="")

    requested_by_username = models.CharField(max_length=255, blank=True, default="")
    requested_by_role = models.CharField(max_length=50, blank=True, default="")

    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    performance_location = models.CharField(max_length=50, blank=True, default="Onsite")

    max_offers = models.IntegerField(null=True, blank=True)
    max_accepted_offers = models.IntegerField(null=True, blank=True)

    required_languages = models.JSONField(default=list, blank=True)
    must_have_criteria = models.JSONField(default=list, blank=True)
    nice_to_have_criteria = models.JSONField(default=list, blank=True)

    task_description = models.TextField(blank=True, default="")
    further_information = models.TextField(blank=True, default="")

    roles = models.JSONField(default=list, blank=True)

    bidding_cycle_days = models.IntegerField(null=True, blank=True)
    bidding_start_at = models.DateTimeField(null=True, blank=True)
    bidding_end_at = models.DateTimeField(null=True, blank=True)
    bidding_active = models.BooleanField(null=True, blank=True)

    external_payload = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.id} - {self.title}"


class ServiceOffer(models.Model):
    """
    Offer supports lifecycle:
    DRAFT -> SUBMITTED -> ACCEPTED / REJECTED

    We store:
      - serviceRequest snapshot (optional)
      - specialists[] and commercial fields as JSON (response)
    """
    STATUS_CHOICES = [
        ("DRAFT", "DRAFT"),
        ("SUBMITTED", "SUBMITTED"),
        ("ACCEPTED", "ACCEPTED"),
        ("REJECTED", "REJECTED"),
    ]

    id = models.AutoField(primary_key=True)

    service_request = models.ForeignKey(ServiceRequest, on_delete=models.CASCADE, related_name="offers")
    provider = models.ForeignKey("providers.Provider", on_delete=models.CASCADE, related_name="service_offers")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="service_offers_created",
    )
    # snapshot of SR at time of offer (optional)
    request_snapshot = models.JSONField(null=True, blank=True)

    # main offer payload (we will store specialists[], totalCost, supplierName, etc here)
    response = models.JSONField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="DRAFT")
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Group3 tracking (optional but useful)
    group3_last_status = models.IntegerField(null=True, blank=True)
    group3_last_response = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"Offer {self.id} for {self.service_request_id}"


class ServiceOrder(models.Model):
    """
    Created when Group3 ACCEPTS an offer.
    One order can have multiple specialists via ServiceOrderAssignment.
    """

    STATUS_CHOICES = [("ACTIVE", "ACTIVE"), ("COMPLETED", "COMPLETED")]

    id = models.AutoField(primary_key=True)

    service_offer = models.OneToOneField(ServiceOffer, on_delete=models.CASCADE, related_name="service_order")
    service_request = models.ForeignKey(ServiceRequest, on_delete=models.PROTECT, related_name="service_orders")
    provider = models.ForeignKey("providers.Provider", on_delete=models.CASCADE, related_name="service_orders")

    title = models.CharField(max_length=255, blank=True, default="")
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    location = models.CharField(max_length=50, blank=True, default="Onsite")

    man_days = models.IntegerField(default=0)  # optional summary
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="ACTIVE")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order {self.id} ({self.provider_id})"


class ServiceOrderAssignment(models.Model):
    """
    Links a ServiceOrder to one or more specialists.
    FIXES: do NOT define both specialist and specialist_id (your current error).
    """

    order = models.ForeignKey(ServiceOrder, on_delete=models.CASCADE, related_name="assignments")
    specialist = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="service_order_assignments",
    )

    daily_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    travelling_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    specialist_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    match_must_have_criteria = models.BooleanField(default=True)
    match_nice_to_have_criteria = models.BooleanField(default=True)
    match_language_skills = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("order", "specialist")

    def __str__(self):
        return f"Assignment Order={self.order_id} Specialist={self.specialist_id}"


class ServiceOrderChangeRequest(models.Model):
    """
    Change request lifecycle for Service Orders.

    Bi-directional:
    - created_by_system=True  => created by Group 3 (Project Manager side)
    - created_by_system=False => created by our provider users (Supplier Rep / Provider Admin)

    Status:
      Requested -> Approved / Declined
    """

    TYPE_CHOICES = [("Extension", "Extension"), ("Substitution", "Substitution")]
    STATUS_CHOICES = [("Requested", "Requested"), ("Approved", "Approved"), ("Declined", "Declined")]

    id = models.AutoField(primary_key=True)

    service_order = models.ForeignKey("procurement.ServiceOrder", on_delete=models.CASCADE, related_name="change_requests")
    provider = models.ForeignKey("providers.Provider", on_delete=models.CASCADE, related_name="order_change_requests")

    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Requested")

    created_by_system = models.BooleanField(default=False)
    created_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="order_change_requests_created"
    )
    decided_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="order_change_requests_decided"
    )

    reason = models.TextField(blank=True, default="")
    provider_response_note = models.TextField(blank=True, default="")

    # Extension fields
    new_end_date = models.DateField(null=True, blank=True)
    additional_man_days = models.IntegerField(null=True, blank=True)
    new_total_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    # Substitution fields
    old_specialist = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="order_change_requests_old_specialist"
    )
    new_specialist = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="order_change_requests_new_specialist"
    )

    # Track outbound Group3 calls (optional but useful for debugging)
    group3_last_status = models.IntegerField(null=True, blank=True)
    group3_last_response = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"CR#{self.id} {self.type} ({self.status}) Order={self.service_order_id}"
