from django.db import models
from django.conf import settings


from django.db import models
from providers.models import Provider


class Contract(models.Model):
    STATUS_CHOICES = [
        ("Draft", "Draft"),
        ("Published", "Published"),
        ("In Negotiation", "In Negotiation"),
        ("Awarded", "Awarded"),
        ("Active", "Active"),
        ("Expired", "Expired"),
    ]

    KIND_CHOICES = [
        ("Service", "Service"),
        ("License", "License"),
        ("Hardware", "Hardware"),
    ]

    id = models.CharField(primary_key=True, max_length=20)  # e.g. C001
    title = models.CharField(max_length=255)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Draft")
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default="Service")

    published_at = models.DateTimeField(null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    scope_of_work = models.TextField(blank=True, default="")
    terms_and_conditions = models.TextField(blank=True, default="")

    functional_weight = models.PositiveIntegerField(null=True, blank=True)
    commercial_weight = models.PositiveIntegerField(null=True, blank=True)

    # Flexible contract config (you already modelled it in FE as AllowedRequestConfigs)
    allowed_request_configs = models.JSONField(null=True, blank=True)

    awarded_provider = models.ForeignKey(
        Provider,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="awarded_contracts",
    )

    # Request type configs enforced later (Milestone 5), but stored now:
    # {
    #   "Single": {"offerDeadlineDays": 5, "cycles": 1},
    #   "Team": {"offerDeadlineDays": 7, "cycles": 2}
    # }

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.id} - {self.title}"


class ContractAward(models.Model):
    """
    Records the final award decision by Group2 system.
    One contract can be awarded once (OneToOne).
    """
    contract = models.OneToOneField(Contract, on_delete=models.CASCADE, related_name="award")
    provider = models.ForeignKey(Provider, on_delete=models.PROTECT, related_name="contract_awards")

    awarded_at = models.DateTimeField(auto_now_add=True)

    # traceability fields
    created_by_system = models.BooleanField(default=True)
    note = models.TextField(blank=True, default="")

    def __str__(self):
        return f"Award {self.contract_id} -> {self.provider_id}"


class ContractOffer(models.Model):
    STATUS_CHOICES = [
        ("Draft", "Draft"),
        ("Submitted", "Submitted"),
        ("Countered", "Countered"),
        ("Accepted", "Accepted"),
        ("Rejected", "Rejected"),
        ("Withdrawn", "Withdrawn"),
    ]

    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name="offers")
    provider = models.ForeignKey("providers.Provider", on_delete=models.CASCADE, related_name="contract_offers")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contract_offers_created",
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Submitted")

    proposed_daily_rate = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    proposed_terms = models.TextField(blank=True, default="")
    note = models.TextField(blank=True, default="")

    submitted_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Offer {self.id} ({self.provider_id}) -> {self.contract_id}"
