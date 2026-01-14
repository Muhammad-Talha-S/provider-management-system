from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from providers.models import Provider
from accounts.models import User
from contracts.models import Contract, ContractOffer
from procurement.models import ServiceRequest, ServiceOffer, ServiceOrder
from procurement.serializers import Group3OfferDecisionSerializer


@dataclass
class ProviderSeedSpec:
    id: str
    name: str
    specialists: int


PROVIDERS: list[ProviderSeedSpec] = [
    ProviderSeedSpec(id="P001", name="Müller Technik GmbH", specialists=10),
    ProviderSeedSpec(id="P002", name="Schneider Solutions AG", specialists=15),
    ProviderSeedSpec(id="P003", name="Bergmann IT Services GmbH", specialists=20),
]


def _ensure_decimal(v) -> Decimal:
    if isinstance(v, Decimal):
        return v
    return Decimal(str(v))


def _create_provider(spec: ProviderSeedSpec) -> Provider:
    defaults = {
        "name": spec.name,
        "contact_name": "Demo Contact",
        "contact_email": f"contact.{spec.id.lower()}@demo.local",
        "contact_phone": "+49 30 1234567",
        "address": "Berlin, Germany",
        "email_notifications": True,
        "sms_notifications": False,
        "preferred_language": "German",
        "status": "Active",
        "created_at": date.today(),
    }
    obj, _ = Provider.objects.get_or_create(id=spec.id, defaults=defaults)

    # Ensure active for demo
    if obj.status != "Active":
        obj.status = "Active"
        obj.save(update_fields=["status"])

    return obj


def _create_user(
    *,
    user_id: str,
    provider: Provider,
    name: str,
    email: str,
    role: str,
    password: str = "Demo@12345",
    status: str = "Active",
    is_staff: bool = False,
    specialist_fields: dict | None = None,
) -> User:
    specialist_fields = specialist_fields or {}

    defaults = {
        "name": name,
        "email": email,
        "role": role,
        "provider": provider,
        "status": status,
        "created_at": date.today(),
        "is_active": True,
        "is_staff": is_staff,
        **specialist_fields,
    }

    u, created = User.objects.get_or_create(id=user_id, defaults=defaults)

    # keep consistent
    changed = False
    if u.provider_id != provider.id:
        u.provider = provider
        changed = True
    if u.role != role:
        u.role = role
        changed = True
    if u.status != status:
        u.status = status
        changed = True
    if changed:
        u.save()

    if created:
        u.set_password(password)
        u.save(update_fields=["password"])

    return u


def _create_contract(
    *,
    contract_id: str,
    title: str,
    status: str,
    kind: str,
    allowed_request_configs: dict,
    awarded_provider: Provider | None = None,
    published_at=None,
    start_date_val: date | None = None,
    end_date_val: date | None = None,
) -> Contract:
    defaults = {
        "title": title,
        "status": status,
        "kind": kind,
        "published_at": published_at,
        "start_date": start_date_val,
        "end_date": end_date_val,
        "scope_of_work": "Demo scope of work.\n- Provide specialists\n- Deliver services\n- SLA adherence",
        "terms_and_conditions": "Demo T&C.\nPayment Net 30.\nStandard NDA applies.",
        "functional_weight": 60,
        "commercial_weight": 40,
        "allowed_request_configs": allowed_request_configs,
        "awarded_provider": awarded_provider,
    }

    c, _ = Contract.objects.update_or_create(id=contract_id, defaults=defaults)
    return c


def _create_service_request(
    *,
    sr_id: str,
    title: str,
    sr_type: str,
    contract: Contract,
    offer_deadline_days: int,
    cycles: int,
    role: str,
    technology: str,
    exp: str,
    start: date,
    end: date,
    man_days: int,
    onsite_days: int,
    status: str = "Open",
) -> ServiceRequest:
    offer_deadline_at = timezone.now() + timedelta(days=offer_deadline_days)

    defaults = {
        "title": title,
        "type": sr_type,
        "linked_contract_id": contract.id,
        "offer_deadline_at": offer_deadline_at,
        "cycles": cycles,
        "role": role,
        "technology": technology,
        "experience_level": exp,
        "start_date": start,
        "end_date": end,
        "total_man_days": man_days,
        "onsite_days": onsite_days,
        "performance_location": "Onshore",
        "required_languages": ["German", "English"],
        "must_have_criteria": ["3+ years relevant experience", "Strong communication"],
        "nice_to_have_criteria": ["Automotive domain experience"],
        "task_description": "Demo Service Request created via seed.\nImplement feature X and integrate system Y.",
        "status": status,
    }

    sr, _ = ServiceRequest.objects.update_or_create(id=sr_id, defaults=defaults)
    return sr


def _create_service_offer_submitted(
    *,
    sr: ServiceRequest,
    provider: Provider,
    created_by: User,
    specialist: User,
    daily_rate: Decimal,
    travel_per_day: Decimal,
) -> ServiceOffer:
    total_cost = (daily_rate * _ensure_decimal(sr.total_man_days or 0)) + (
        travel_per_day * _ensure_decimal(sr.onsite_days or 0)
    )

    offer = ServiceOffer.objects.create(
        service_request=sr,
        provider=provider,
        specialist=specialist,
        created_by=created_by,
        daily_rate=daily_rate,
        travel_cost_per_onsite_day=travel_per_day,
        total_cost=total_cost,
        contractual_relationship="Employee",
        status="Submitted",
        submitted_at=timezone.now(),
        must_have_match_percentage=85,
        nice_to_have_match_percentage=70,
    )
    return offer


def _group3_accept_offer_and_create_order(offer: ServiceOffer) -> ServiceOrder:
    """
    Uses your existing serializer logic so the order is created automatically when accepted.
    """
    ser = Group3OfferDecisionSerializer(
        data={"decision": "Accept"},
        context={"offer": offer},
    )
    ser.is_valid(raise_exception=True)
    result = ser.save()
    order: ServiceOrder = result["order"]
    return order


def _mark_order_completed(order: ServiceOrder):
    order.status = "Completed"
    if order.end_date is None:
        order.end_date = date.today() - timedelta(days=5)
    order.save(update_fields=["status", "end_date"])


def _update_specialist_counters(provider: Provider):
    specialists = User.objects.filter(provider=provider, role="Specialist")
    for sp in specialists:
        completed = ServiceOrder.objects.filter(provider=provider, specialist=sp, status="Completed").count()
        active = ServiceOrder.objects.filter(provider=provider, specialist=sp, status="Active").count()
        User.objects.filter(id=sp.id).update(
            service_requests_completed=completed,
            service_orders_active=active,
        )


class Command(BaseCommand):
    help = "Seeds demo data for Provider Management System (providers + users + contracts + procurement)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete demo objects before re-seeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        reset = options.get("reset", False)

        if reset:
            self.stdout.write(self.style.WARNING("Resetting demo data..."))

            ServiceOrder.objects.filter(provider_id__in=["P001", "P002", "P003"]).delete()
            ServiceOffer.objects.filter(provider_id__in=["P001", "P002", "P003"]).delete()
            ServiceRequest.objects.filter(id__in=["SRD001", "SRD002", "SRD003", "SRD101", "SRD201"]).delete()

            ContractOffer.objects.filter(contract_id="C010").delete()
            Contract.objects.filter(id__in=["C001", "C002", "C003", "C010"]).delete()

            User.objects.filter(provider_id__in=["P001", "P002", "P003"]).delete()
            Provider.objects.filter(id__in=["P001", "P002", "P003"]).delete()

        # 1) Providers
        providers: dict[str, Provider] = {}
        for spec in PROVIDERS:
            providers[spec.id] = _create_provider(spec)

        p1, p2, p3 = providers["P001"], providers["P002"], providers["P003"]

        # 2) Users per provider
        admins: dict[str, User] = {}
        supplier_reps: dict[str, User] = {}
        coordinators: dict[str, User] = {}
        specialists_by_provider: dict[str, list[User]] = {}

        for idx, spec in enumerate(PROVIDERS, start=1):
            p = providers[spec.id]

            admins[spec.id] = _create_user(
                user_id=f"U{idx:03d}A",
                provider=p,
                name=f"{spec.name.split()[0]} Admin",
                email=f"admin.{spec.id.lower()}@demo.local",
                role="Provider Admin",
                is_staff=True,
            )

            supplier_reps[spec.id] = _create_user(
                user_id=f"U{idx:03d}S",
                provider=p,
                name=f"{spec.name.split()[0]} SupplierRep",
                email=f"supplier.{spec.id.lower()}@demo.local",
                role="Supplier Representative",
            )

            coordinators[spec.id] = _create_user(
                user_id=f"U{idx:03d}C",
                provider=p,
                name=f"{spec.name.split()[0]} Coordinator",
                email=f"coordinator.{spec.id.lower()}@demo.local",
                role="Contract Coordinator",
            )

            specialists: list[User] = []
            for s in range(1, spec.specialists + 1):
                sp_id = f"SP{idx}{s:03d}"  # SP1001, SP2001 ...
                sp = _create_user(
                    user_id=sp_id,
                    provider=p,
                    name=f"Specialist {idx}-{s}",
                    email=f"specialist{idx}-{s}@demo.local",
                    role="Specialist",
                    specialist_fields={
                        "experience_level": "Senior" if s % 4 == 0 else ("Mid" if s % 3 == 0 else "Junior"),
                        "technology_level": "Advanced" if s % 5 == 0 else "Intermediate",
                        "performance_grade": "A" if s % 6 == 0 else "B",
                        "average_daily_rate": Decimal("650.00") if s % 4 == 0 else Decimal("520.00"),
                        "skills": ["Python", "React", "AWS"] if s % 2 == 0 else ["Java", "Spring", "PostgreSQL"],
                        "availability": "Available" if s % 3 != 0 else "Partially Booked",
                        "service_requests_completed": 0,
                        "service_orders_active": 0,
                    },
                )
                specialists.append(sp)

            specialists_by_provider[spec.id] = specialists

        # 3) Contracts
        today = date.today()
        active_start = today - timedelta(days=10)
        active_end = today + timedelta(days=90)

        c001 = _create_contract(
            contract_id="C001",
            title="C001 - Framework: IT Specialist Services (Main Demo)",
            status="Active",
            kind="Service",
            allowed_request_configs={
                "Single": {"offerDeadlineDays": 5, "cycles": 1},
                "Team": {"offerDeadlineDays": 7, "cycles": 2},
            },
            awarded_provider=p1,
            published_at=timezone.now() - timedelta(days=15),
            start_date_val=active_start,
            end_date_val=active_end,
        )

        c002 = _create_contract(
            contract_id="C002",
            title="C002 - Support Contract (Demo for P002)",
            status="Active",
            kind="Service",
            allowed_request_configs={"Single": {"offerDeadlineDays": 3, "cycles": 1}},
            awarded_provider=p2,
            published_at=timezone.now() - timedelta(days=20),
            start_date_val=active_start,
            end_date_val=active_end,
        )

        c003 = _create_contract(
            contract_id="C003",
            title="C003 - Cloud Migration Services (Demo for P003)",
            status="Active",
            kind="Service",
            allowed_request_configs={"Single": {"offerDeadlineDays": 4, "cycles": 1}},
            awarded_provider=p3,
            published_at=timezone.now() - timedelta(days=25),
            start_date_val=active_start,
            end_date_val=active_end,
        )

        c010 = _create_contract(
            contract_id="C010",
            title="C010 - Published Contract (Offer Submission Demo)",
            status="Published",
            kind="Service",
            allowed_request_configs={"Single": {"offerDeadlineDays": 5, "cycles": 1}},
            awarded_provider=None,
            published_at=timezone.now() - timedelta(days=2),
            start_date_val=today + timedelta(days=7),
            end_date_val=today + timedelta(days=180),
        )

        # 4) Service Requests
        # Required: 2 open SRs under the ONE active contract (C001)
        sr1 = _create_service_request(
            sr_id="SRD001",
            title="SRD001 - Backend Engineer (API Integrations)",
            sr_type="Single",
            contract=c001,
            offer_deadline_days=5,
            cycles=1,
            role="Backend Engineer",
            technology="Django + PostgreSQL",
            exp="Senior",
            start=today + timedelta(days=7),
            end=today + timedelta(days=60),
            man_days=40,
            onsite_days=5,
            status="Open",
        )

        sr2 = _create_service_request(
            sr_id="SRD002",
            title="SRD002 - Frontend Engineer (React Dashboard)",
            sr_type="Team",
            contract=c001,
            offer_deadline_days=7,
            cycles=2,
            role="Frontend Engineer",
            technology="React + TypeScript",
            exp="Mid",
            start=today + timedelta(days=10),
            end=today + timedelta(days=70),
            man_days=50,
            onsite_days=8,
            status="Open",
        )

        # EXTRA: past SR to generate a COMPLETED order for a specialist (to show in MyOrders)
        sr3 = _create_service_request(
            sr_id="SRD003",
            title="SRD003 - QA Engineer (Completed Order Demo)",
            sr_type="Single",
            contract=c001,
            offer_deadline_days=2,
            cycles=1,
            role="QA Engineer",
            technology="Cypress + Playwright",
            exp="Junior",
            start=today - timedelta(days=45),
            end=today - timedelta(days=15),
            man_days=18,
            onsite_days=2,
            status="Open",  # will be closed automatically when accepted
        )

        # Additional SRs for P002/P003 completed orders
        sr_p2 = _create_service_request(
            sr_id="SRD101",
            title="SRD101 - Support Engineer (P002 Completed Demo)",
            sr_type="Single",
            contract=c002,
            offer_deadline_days=3,
            cycles=1,
            role="Support Engineer",
            technology="Linux + Monitoring",
            exp="Mid",
            start=today - timedelta(days=40),
            end=today - timedelta(days=10),
            man_days=20,
            onsite_days=2,
            status="Open",
        )

        sr_p3 = _create_service_request(
            sr_id="SRD201",
            title="SRD201 - Cloud Engineer (P003 Completed Demo)",
            sr_type="Single",
            contract=c003,
            offer_deadline_days=4,
            cycles=1,
            role="Cloud Engineer",
            technology="AWS + Terraform",
            exp="Senior",
            start=today - timedelta(days=35),
            end=today - timedelta(days=5),
            man_days=25,
            onsite_days=3,
            status="Open",
        )

        # 5) Offers + Accept to auto-create orders
        p1_rep = supplier_reps["P001"]
        p1_specs = specialists_by_provider["P001"]

        # Active order from SRD001
        offer1 = _create_service_offer_submitted(
            sr=sr1,
            provider=p1,
            created_by=p1_rep,
            specialist=p1_specs[0],
            daily_rate=Decimal("650.00"),
            travel_per_day=Decimal("80.00"),
        )
        order1 = _group3_accept_offer_and_create_order(offer1)
        # Keep as Active (for demo)

        # Leave SRD002 open with a submitted offer (pending)
        _create_service_offer_submitted(
            sr=sr2,
            provider=p1,
            created_by=p1_rep,
            specialist=p1_specs[1],
            daily_rate=Decimal("550.00"),
            travel_per_day=Decimal("70.00"),
        )

        # Completed order for MyOrders demo (P001 specialist)
        offer3 = _create_service_offer_submitted(
            sr=sr3,
            provider=p1,
            created_by=p1_rep,
            specialist=p1_specs[2],
            daily_rate=Decimal("450.00"),
            travel_per_day=Decimal("50.00"),
        )
        order3 = _group3_accept_offer_and_create_order(offer3)
        _mark_order_completed(order3)

        # P002 completed
        p2_rep = supplier_reps["P002"]
        p2_specs = specialists_by_provider["P002"]
        offer_p2 = _create_service_offer_submitted(
            sr=sr_p2,
            provider=p2,
            created_by=p2_rep,
            specialist=p2_specs[0],
            daily_rate=Decimal("500.00"),
            travel_per_day=Decimal("60.00"),
        )
        order_p2 = _group3_accept_offer_and_create_order(offer_p2)
        _mark_order_completed(order_p2)

        # P003 completed
        p3_rep = supplier_reps["P003"]
        p3_specs = specialists_by_provider["P003"]
        offer_p3 = _create_service_offer_submitted(
            sr=sr_p3,
            provider=p3,
            created_by=p3_rep,
            specialist=p3_specs[0],
            daily_rate=Decimal("700.00"),
            travel_per_day=Decimal("90.00"),
        )
        order_p3 = _group3_accept_offer_and_create_order(offer_p3)
        _mark_order_completed(order_p3)

        # 6) Contract offers for Published contract (C010)
        ContractOffer.objects.get_or_create(
            contract=c010,
            provider=p1,
            defaults={
                "created_by": supplier_reps["P001"],
                "status": "Submitted",
                "proposed_daily_rate": Decimal("600.00"),
                "proposed_terms": "Demo terms: 30-day notice, remote-first, SLA 99.5%.",
                "note": "We can start within 2 weeks.",
            },
        )
        ContractOffer.objects.get_or_create(
            contract=c010,
            provider=p2,
            defaults={
                "created_by": supplier_reps["P002"],
                "status": "Submitted",
                "proposed_daily_rate": Decimal("580.00"),
                "proposed_terms": "Demo terms: flexible staffing, quarterly review.",
                "note": "We offer a dedicated account manager.",
            },
        )

        # 7) Update specialist counters
        for p in providers.values():
            _update_specialist_counters(p)

        self.stdout.write(self.style.SUCCESS("✅ Demo seed completed successfully."))
        self.stdout.write(
            self.style.SUCCESS(
                "Login demo users (password: Demo@12345):\n"
                "- admin.p001@demo.local\n"
                "- supplier.p001@demo.local\n"
                "- coordinator.p001@demo.local\n"
                "- specialist1-1@demo.local  (has ACTIVE order)\n"
                "- specialist1-3@demo.local  (has COMPLETED order -> shows in MyOrders)\n"
                "Same pattern for P002/P003."
            )
        )
