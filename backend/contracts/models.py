from django.db import models
from providers.models import Provider


class Contract(models.Model):
    """
    Contract snapshot from Group2.

    - We store the raw payload in `external_snapshot`
    - We store canonical validation config under `config` (same shape as Group2 allowedConfiguration)
    - Multi-provider awards are represented by ContractProviderStatus
    """

    STATUS_CHOICES = [
        ("DRAFT", "DRAFT"),
        ("PUBLISHED", "PUBLISHED"),
        ("IN_NEGOTIATION", "IN_NEGOTIATION"),
        ("ACTIVE", "ACTIVE"),
        ("EXPIRED", "EXPIRED"),
    ]

    KIND_CHOICES = [
        ("SERVICE", "SERVICE"),
        ("LICENSE", "LICENSE"),
        ("HARDWARE", "HARDWARE"),
    ]

    id = models.CharField(primary_key=True, max_length=50)  # contractId from Group2 (e.g. C001)
    title = models.CharField(max_length=255, blank=True, default="")

    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default="SERVICE")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="DRAFT")

    publishing_date = models.DateField(null=True, blank=True)
    offer_deadline_at = models.DateTimeField(null=True, blank=True)

    stakeholders = models.JSONField(null=True, blank=True)
    scope_of_work = models.TextField(blank=True, default="")
    terms_and_conditions = models.TextField(blank=True, default="")
    weighting = models.JSONField(null=True, blank=True)

    # Canonical validation config (based on Group2.allowedConfiguration)
    config = models.JSONField(null=True, blank=True)

    # Raw full payload from Group2 (audit/debug)
    external_snapshot = models.JSONField(null=True, blank=True)

    versions_and_documents = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.id} - {self.title}"


class ContractProviderStatus(models.Model):
    """
    Multi-provider link with per-provider status.
    This is how we model:
      - Provider A: ACTIVE (can receive service requests)
      - Provider B: IN_NEGOTIATION (cannot receive service requests)
    """

    STATUS_CHOICES = [
        ("IN_NEGOTIATION", "IN_NEGOTIATION"),
        ("ACTIVE", "ACTIVE"),
        ("EXPIRED", "EXPIRED"),
    ]

    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name="provider_statuses")
    provider = models.ForeignKey(Provider, on_delete=models.CASCADE, related_name="contract_statuses")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="IN_NEGOTIATION")

    awarded_at = models.DateTimeField(null=True, blank=True)
    note = models.TextField(blank=True, default="")

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("contract", "provider")

    def __str__(self):
        return f"{self.contract_id} - {self.provider_id} ({self.status})"


class ContractOffer(models.Model):
    STATUS_CHOICES = [
        ("DRAFT", "DRAFT"),
        ("SUBMITTED", "SUBMITTED"),
        ("COUNTERED", "COUNTERED"),
        ("ACCEPTED", "ACCEPTED"),
        ("REJECTED", "REJECTED"),
        ("WITHDRAWN", "WITHDRAWN"),
    ]

    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name="offers")
    provider = models.ForeignKey(Provider, on_delete=models.CASCADE, related_name="contract_offers")

    created_by_user_id = models.CharField(max_length=50, blank=True, null=True)

    request_snapshot = models.JSONField(null=True, blank=True)
    response = models.JSONField(null=True, blank=True)
    deltas = models.JSONField(null=True, blank=True)

    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="SUBMITTED")

    note = models.TextField(blank=True, default="")

    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
