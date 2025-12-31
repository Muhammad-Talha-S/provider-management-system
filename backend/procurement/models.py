from __future__ import annotations

import uuid
from django.db import models


# ---------- Contracts ----------

class Contract(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    title = models.CharField(max_length=255)
    status = models.CharField(max_length=20)  # DRAFT/PUBLISHED/ACTIVE/EXPIRED/CLOSED

    publishing_date = models.DateField(blank=True, null=True)
    offer_deadline_at = models.DateTimeField(blank=True, null=True)

    scope_of_work = models.TextField(blank=True, null=True)
    terms_and_conditions = models.TextField(blank=True, null=True)

    negotiation_history = models.JSONField(blank=True, null=True)

    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)

    functional_weight_pct = models.IntegerField(blank=True, null=True)
    commercial_weight_pct = models.IntegerField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class ContractDomain(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name="domains")
    domain_name = models.CharField(max_length=255)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["contract", "domain_name"], name="uniq_contract_domain")
        ]


class ContractRole(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name="roles")
    # IMPORTANT: this should reference JOB roles, not SYSTEM roles (enforced in seed / code)
    role_definition = models.ForeignKey("accounts.RoleDefinition", on_delete=models.PROTECT)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["contract", "role_definition"], name="uniq_contract_role")
        ]


class ContractRequestTypeRule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name="request_type_rules")

    request_type = models.CharField(max_length=30)  # SINGLE/MULTI/TEAM/WORK_CONTRACT
    offer_deadline_days = models.IntegerField()
    cycles = models.IntegerField()  # 1 or 2

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["contract", "request_type"], name="uniq_contract_request_type_rule")
        ]


class ContractVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name="versions")

    version_no = models.IntegerField()
    status = models.CharField(max_length=20)  # PROPOSED/SIGNED/REJECTED
    document_url = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["contract", "version_no"], name="uniq_contract_version_no")
        ]


# ---------- Service Requests ----------

class ServiceRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    title = models.CharField(max_length=255)
    request_type = models.CharField(max_length=30)  # SINGLE/MULTI/TEAM/WORK_CONTRACT

    contract = models.ForeignKey(Contract, on_delete=models.PROTECT, related_name="service_requests")

    requested_by_external_id = models.CharField(max_length=120, blank=True, null=True)  # Project Manager (external)
    status = models.CharField(max_length=20)  # DRAFT/PUBLISHED/CLOSED/CANCELLED

    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)

    domain_name = models.CharField(max_length=255, blank=True, null=True)

    # IMPORTANT: JOB role requested (e.g., Backend Django Developer)
    role_definition = models.ForeignKey(
        "accounts.RoleDefinition", on_delete=models.PROTECT, blank=True, null=True
    )

    technology = models.CharField(max_length=255, blank=True, null=True)
    experience_level = models.CharField(max_length=20, blank=True, null=True)

    sum_man_days = models.IntegerField(blank=True, null=True)
    onsite_days = models.IntegerField(blank=True, null=True)

    performance_location = models.CharField(max_length=20, blank=True, null=True)  # ONSHORE/NEARSHORE/OFFSHORE

    task_description = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["contract"]),
            models.Index(fields=["status"]),
            models.Index(fields=["domain_name"]),
            models.Index(fields=["role_definition"]),
        ]


class ServiceRequestRequirement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service_request = models.ForeignKey(ServiceRequest, on_delete=models.CASCADE, related_name="requirements")

    type = models.CharField(max_length=20)  # MUST_HAVE / NICE_TO_HAVE
    skill_name = models.CharField(max_length=255)
    weight_pct = models.IntegerField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["service_request"]),
            models.Index(fields=["service_request", "type"]),
        ]


class ServiceRequestLanguage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service_request = models.ForeignKey(ServiceRequest, on_delete=models.CASCADE, related_name="languages")

    language = models.CharField(max_length=80)
    skill_level = models.CharField(max_length=30)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["service_request", "language"], name="uniq_request_language")
        ]


# ---------- Offers ----------

class ServiceOffer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    service_request = models.ForeignKey(ServiceRequest, on_delete=models.CASCADE, related_name="offers")
    provider = models.ForeignKey("providers.Provider", on_delete=models.PROTECT, related_name="offers")

    submitted_by_user = models.ForeignKey(
        "accounts.ProviderUser", on_delete=models.PROTECT, related_name="submitted_offers"
    )

    # Specialist is a user (employee)
    specialist_user = models.ForeignKey(
        "accounts.ProviderUser", on_delete=models.PROTECT, related_name="offers_as_specialist"
    )

    daily_rate_eur = models.DecimalField(max_digits=10, decimal_places=2)
    travel_cost_per_onsite_day_eur = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_cost_eur = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)

    contractual_relationship = models.CharField(max_length=30)  # EMPLOYEE/FREELANCER/SUBCONTRACTOR
    subcontractor_company_name = models.CharField(max_length=255, blank=True, null=True)

    status = models.CharField(max_length=20)  # DRAFT/SUBMITTED/WITHDRAWN/ACCEPTED/REJECTED/EXPIRED
    match_score = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["service_request"]),
            models.Index(fields=["provider"]),
            models.Index(fields=["submitted_by_user"]),
            models.Index(fields=["specialist_user"]),
            models.Index(fields=["service_request", "provider"]),
        ]


class ServiceOfferMatchDetail(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service_offer = models.OneToOneField(ServiceOffer, on_delete=models.CASCADE, related_name="match_detail")
    details = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)


# ---------- Orders ----------

class ServiceOrder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    title = models.CharField(max_length=255)

    service_request = models.ForeignKey(ServiceRequest, on_delete=models.PROTECT, related_name="orders")
    accepted_offer = models.OneToOneField(ServiceOffer, on_delete=models.PROTECT, related_name="accepted_into_order")

    provider = models.ForeignKey("providers.Provider", on_delete=models.PROTECT, related_name="orders")
    supplier_representative_user = models.ForeignKey(
        "accounts.ProviderUser", on_delete=models.PROTECT, related_name="service_orders_as_rep"
    )

    # Specialist assigned is a user (employee)
    specialist_user = models.ForeignKey(
        "accounts.ProviderUser", on_delete=models.PROTECT, related_name="service_orders_as_specialist"
    )

    role_definition = models.ForeignKey("accounts.RoleDefinition", on_delete=models.PROTECT, blank=True, null=True)

    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)

    location = models.CharField(max_length=255, blank=True, null=True)
    man_days = models.IntegerField(blank=True, null=True)

    status = models.CharField(max_length=20)  # ACTIVE/COMPLETED/CANCELLED/IN_CHANGE

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["service_request"]),
            models.Index(fields=["provider"]),
            models.Index(fields=["supplier_representative_user"]),
            models.Index(fields=["specialist_user"]),
            models.Index(fields=["status"]),
        ]


class ServiceOrderChangeRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    service_order = models.ForeignKey(ServiceOrder, on_delete=models.CASCADE, related_name="change_requests")

    change_type = models.CharField(max_length=20)  # SUBSTITUTION / EXTENSION
    initiated_by_type = models.CharField(max_length=20)  # PROJECT_MANAGER / SUPPLIER_REP

    initiated_by_user = models.ForeignKey(
        "accounts.ProviderUser", on_delete=models.PROTECT, blank=True, null=True, related_name="initiated_changes"
    )
    initiated_by_external_id = models.CharField(max_length=120, blank=True, null=True)

    status = models.CharField(max_length=20)  # REQUESTED/APPROVED/REJECTED/COMPLETED
    payload = models.JSONField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["service_order"]),
            models.Index(fields=["change_type"]),
            models.Index(fields=["status"]),
        ]


# ---------- Activity Logs ----------

class ActivityLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    provider = models.ForeignKey("providers.Provider", on_delete=models.PROTECT, blank=True, null=True)
    actor_user = models.ForeignKey("accounts.ProviderUser", on_delete=models.PROTECT, blank=True, null=True)

    action = models.CharField(max_length=120)
    entity_type = models.CharField(max_length=120, blank=True, null=True)
    entity_id = models.UUIDField(blank=True, null=True)

    details = models.JSONField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["provider"]),
            models.Index(fields=["actor_user"]),
            models.Index(fields=["entity_type", "entity_id"]),
        ]
