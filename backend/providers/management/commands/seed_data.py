from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Tuple

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from providers.models import Provider
from accounts.models import User
from contracts.models import Contract, ContractOffer, ContractAward
from procurement.models import (
    ServiceRequest,
    ServiceOffer,
    ServiceOrder,
    ServiceOrderChangeRequest,
)
from activitylog.models import ActivityLog


PASSWORD = "login123"
TODAY = date(2026, 1, 15)
START_RANGE = TODAY - timedelta(days=730)

DOMAIN_BY_PROVIDER = {
    "P001": "rheintech.de",
    "P002": "nordcloud-consulting.de",
    "P003": "bavaria-digital.de",
}

PROVIDERS = [
    {
        "id": "P001",
        "name": "RheinTech Solutions GmbH",
        "contact_name": "Anna Schmidt",
        "contact_email": "kontakt@rheintech.de",
        "contact_phone": "+49 69 3201 4450",
        "address": "Mainzer Landstraße 46, 60325 Frankfurt am Main, Deutschland",
        "preferred_language": "German",
        "created_at": date(2022, 11, 4),
    },
    {
        "id": "P002",
        "name": "NordCloud Consulting AG",
        "contact_name": "Michael Berg",
        "contact_email": "info@nordcloud-consulting.de",
        "contact_phone": "+49 40 8899 1200",
        "address": "Spitalerstraße 10, 20095 Hamburg, Deutschland",
        "preferred_language": "German",
        "created_at": date(2023, 2, 20),
    },
    {
        "id": "P003",
        "name": "Bavaria Digital Services GmbH",
        "contact_name": "Katharina Weber",
        "contact_email": "service@bavaria-digital.de",
        "contact_phone": "+49 89 7788 3300",
        "address": "Leopoldstraße 45, 80802 München, Deutschland",
        "preferred_language": "German",
        "created_at": date(2023, 6, 12),
    },
]

SPECIALISTS_COUNT = {"P001": 10, "P002": 15, "P003": 20}

# deterministic pools (cycled)
SPECIALIST_ROLE_POOL = [
    ("IT Consultant", ["ITIL", "Requirements", "Stakeholder Mgmt", "MS Office"]),
    ("Project Manager", ["Prince2", "Scrum", "Risk Mgmt", "MS Project"]),
    ("Data Analyst", ["SQL", "Power BI", "Python", "Data Modelling"]),
    ("DevOps Engineer", ["Docker", "Kubernetes", "Terraform", "CI/CD"]),
    ("Cybersecurity Specialist", ["IAM", "SIEM", "Threat Modelling", "ISO 27001"]),
    ("SAP Consultant", ["SAP MM", "SAP SD", "SAP FI", "S/4HANA"]),
    ("QA Engineer", ["Test Automation", "Cypress", "JUnit", "Test Design"]),
    ("UX Designer", ["Figma", "User Research", "Prototyping", "Design Systems"]),
    ("Backend Engineer", ["Python", "Django", "PostgreSQL", "API Design"]),
    ("Cloud Architect", ["AWS", "Azure", "Networking", "Security"]),
]

EXP_SEQ = ["Junior", "Mid", "Mid", "Senior", "Senior", "Expert"]  # cycled
TECH_BY_EXP = {
    "Junior": "Basic",
    "Mid": "Intermediate",
    "Senior": "Advanced",
    "Expert": "Expert",
}
GRADE_BY_EXP = {
    "Junior": "B",
    "Mid": "B",
    "Senior": "A",
    "Expert": "A",
}
RATE_BY_EXP = {  # deterministic "typical" rates (EUR/day)
    "Junior": 520,
    "Mid": 690,
    "Senior": 890,
    "Expert": 1080,
}

REQ_LANG_SEQ = [["German"], ["German", "English"], ["English", "German"], ["English"]]
LOC_SEQ = ["Onshore", "Hybrid", "Onsite", "Onshore", "Hybrid"]

MUST_HAVE_SEQ = [
    ["Fluent German language skills (C1)", "Experience in agile teams (Scrum/Kanban)", "Documentation according to internal standards"],
    ["At least 3 years of project experience", "Stakeholder management", "Experience in regulated environments"],
    ["Hands-on implementation experience", "Experience in agile teams (Scrum/Kanban)"],
]
NICE_HAVE_SEQ = [
    ["Experience in the automotive industry", "Cloud experience (AWS/Azure)"],
    ["Certifications (Scrum Master, Prince2)"],
    ["Knowledge of SAP S/4HANA", "Experience with data governance"],
]

SR_TECH_SEQ = ["AWS", "Azure", "Kubernetes", "SAP S/4HANA", "Python/Django", "Data Platform", "SIEM", "React/TypeScript"]
SR_TYPE_SEQ = ["Single", "Multi", "Team", "Work Contract"]


def aware(y: int, m: int, d: int, hh: int = 10, mm: int = 0) -> datetime:
    return timezone.make_aware(datetime(y, m, d, hh, mm))


def money(x: int | float | Decimal) -> Decimal:
    return Decimal(str(round(float(x), 2)))


def slug_email(full_name: str, domain: str) -> str:
    # deterministic, simple German-friendly slug
    s = full_name.lower()
    s = (
        s.replace("ä", "ae")
        .replace("ö", "oe")
        .replace("ü", "ue")
        .replace("ß", "ss")
        .replace(" ", ".")
        .replace("-", "")
    )
    return f"{s}@{domain}"


def log_event(
    provider: Provider | None,
    actor_type: str,
    actor_user: User | None,
    event_type: str,
    entity_type: str,
    entity_id: str | int,
    message: str,
    metadata=None,
    at: datetime | None = None,
):
    row = ActivityLog.objects.create(
        provider=provider,
        actor_type=actor_type,
        actor_user=actor_user,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=str(entity_id),
        message=message or "",
        metadata=metadata or None,
    )
    if at:
        ActivityLog.objects.filter(pk=row.pk).update(created_at=at)
    return row


def pricing_limits_fixed():
    # fixed grid, stable forever
    limits = []
    roles = ["IT Consultant", "Project Manager", "Data Analyst", "DevOps Engineer", "SAP Consultant", "Cybersecurity Specialist"]
    exp_levels = ["Junior", "Mid", "Senior", "Expert"]
    tech_levels = ["Basic", "Intermediate", "Advanced", "Expert"]

    base = {
        "Junior": 600,
        "Mid": 800,
        "Senior": 1000,
        "Expert": 1200,
    }

    for r in roles:
        for e in exp_levels:
            for t in tech_levels[:2] if e == "Junior" else tech_levels[:3] if e == "Mid" else tech_levels[1:]:
                limits.append(
                    {
                        "role": r,
                        "experienceLevel": e,
                        "technologyLevel": t,
                        "maxRate": float(base[e]),
                    }
                )
    return limits


def version_history_fixed(active: bool):
    base = [
        {"version": 1, "date": "2024-03-15", "status": "Proposed", "changes": "Initial framework agreement draft.", "documentLink": None},
        {"version": 2, "date": "2024-04-05", "status": "Proposed", "changes": "Updated SLA and reporting obligations.", "documentLink": None},
        {"version": 3, "date": "2024-04-20", "status": "Signed", "changes": "Signed framework with pricing caps.", "documentLink": None},
    ]
    if not active:
        base.append({"version": 4, "date": "2025-06-30", "status": "Signed", "changes": "Contract closed after end date.", "documentLink": None})
    return base


class Command(BaseCommand):
    help = "Seed deterministic Germany-based demo data (stable IDs, stable names, stable dates, stable costs)."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("⚠️  Wiping existing data..."))
        self._wipe()

        self.stdout.write(self.style.WARNING("🌱 Seeding Providers..."))
        providers = self._seed_providers()

        self.stdout.write(self.style.WARNING("👤 Seeding Users + Specialists (deterministic)..."))
        users_by_provider, specialists_by_provider = self._seed_users(providers)

        self.stdout.write(self.style.WARNING("📄 Seeding Contracts + Awards + Open Tenders..."))
        contracts_by_provider, open_contracts = self._seed_contracts(providers, users_by_provider)

        self.stdout.write(self.style.WARNING("🧾 Seeding Procurement Flow (SR → Offer → Order → CR) ..."))
        stats = self._seed_procurement(
            providers=providers,
            users_by_provider=users_by_provider,
            specialists_by_provider=specialists_by_provider,
            contracts_by_provider=contracts_by_provider,
            open_contracts=open_contracts,
        )

        self.stdout.write(self.style.SUCCESS("✅ Deterministic seeding completed.\n"))
        self._print_summary(providers, users_by_provider, specialists_by_provider, contracts_by_provider, stats)

    def _wipe(self):
        ActivityLog.objects.all().delete()
        ServiceOrderChangeRequest.objects.all().delete()
        ServiceOrder.objects.all().delete()
        ServiceOffer.objects.all().delete()
        ServiceRequest.objects.all().delete()

        ContractOffer.objects.all().delete()
        ContractAward.objects.all().delete()
        Contract.objects.all().delete()

        User.objects.all().delete()
        Provider.objects.all().delete()

    def _seed_providers(self) -> Dict[str, Provider]:
        out: Dict[str, Provider] = {}
        for p in PROVIDERS:
            provider = Provider.objects.create(
                id=p["id"],
                name=p["name"],
                contact_name=p["contact_name"],
                contact_email=p["contact_email"],
                contact_phone=p["contact_phone"],
                address=p["address"],
                email_notifications=True,
                sms_notifications=False,  # deterministic
                preferred_language=p["preferred_language"],
                status="Active",
                created_at=p["created_at"],
            )
            out[provider.id] = provider

            log_event(
                provider=provider,
                actor_type="SYSTEM",
                actor_user=None,
                event_type="PROVIDER_CREATED",
                entity_type="Provider",
                entity_id=provider.id,
                message=f"Provider '{provider.name}' onboarded.",
                metadata={"providerId": provider.id, "name": provider.name},
                at=aware(2023, 1, 10, 9, 0),
            )
        return out

    def _seed_users(self, providers: Dict[str, Provider]):
        users_by_provider: Dict[str, List[User]] = {}
        specialists_by_provider: Dict[str, List[User]] = {}

        # Deterministic role accounts (same every time)
        role_accounts = {
            "P001": [
                ("U101", "Lea Koch", "Provider Admin", True),
                ("U102", "Daniel Weber", "Supplier Representative", False),
                ("U103", "Sarah Richter", "Contract Coordinator", False),
            ],
            "P002": [
                ("U201", "Max Müller", "Provider Admin", True),
                ("U202", "Hannah Becker", "Supplier Representative", False),
                ("U203", "Johanna Wolf", "Contract Coordinator", False),
            ],
            "P003": [
                ("U301", "Michael Berg", "Provider Admin", True),
                ("U302", "Eva Lange", "Supplier Representative", False),
                ("U303", "Thomas Neumann", "Contract Coordinator", False),
            ],
        }

        # Deterministic specialist name pools (unique)
        specialist_names = {
            "P001": [
                "Jonas Bauer", "Jan Klein", "Clara Hoffmann", "Felix Wagner", "Mia Schäfer",
                "Andreas Krüger", "Laura Schwarz", "Paul Zimmermann", "Nina Hartmann", "Lukas Braun",
            ],
            "P002": [
                "Sophia Koch", "Tim Richter", "Marie Neumann", "David Schmitt", "Lea Wolf",
                "Daniel Schäfer", "Katharina Klein", "Noah Becker", "Julia Müller", "Moritz Wagner",
                "Anna Braun", "Leon Hoffmann", "Sarah Lange", "Max Zimmermann", "Jan Schmidt",
            ],
            "P003": [
                "Eva Weber", "Jonas Schmidt", "Lena Bauer", "Felix Koch", "Mia Richter",
                "Laura Müller", "Paul Wagner", "Nina Becker", "Andreas Hoffmann", "Clara Neumann",
                "David Schwarz", "Marie Schäfer", "Tim Braun", "Moritz Krüger", "Jan Hartmann",
                "Hannah Zimmermann", "Sophia Lange", "Lukas Schmitt", "Julia Wolf", "Thomas Klein",
            ],
        }

        for pid, provider in providers.items():
            domain = DOMAIN_BY_PROVIDER[pid]

            role_users: List[User] = []
            for uid, full, role, is_staff in role_accounts[pid]:
                u = User.objects.create_user(
                    id=uid,
                    name=full,
                    email=slug_email(full, domain),
                    password=PASSWORD,
                    role=role,
                    provider=provider,
                    status="Active",
                    created_at=date(2024, 1, 15),
                    is_active=True,
                    is_staff=is_staff,
                )
                role_users.append(u)
                log_event(
                    provider=provider,
                    actor_type="SYSTEM",
                    actor_user=None,
                    event_type="USER_CREATED",
                    entity_type="User",
                    entity_id=u.id,
                    message=f"Account created for {u.role}: {u.name}.",
                    metadata={"userId": u.id, "role": u.role, "email": u.email},
                    at=aware(2024, 1, 15, 10, 0),
                )

            users_by_provider[pid] = role_users

            specialists: List[User] = []
            for idx, full in enumerate(specialist_names[pid], start=1):
                sid = f"SP{pid[-1]}{idx:03d}"
                exp = EXP_SEQ[(idx - 1) % len(EXP_SEQ)]
                tech = TECH_BY_EXP[exp]
                grade = GRADE_BY_EXP[exp]
                rate = RATE_BY_EXP[exp]
                role_title, base_skills = SPECIALIST_ROLE_POOL[(idx - 1) % len(SPECIALIST_ROLE_POOL)]

                # deterministic extra skills
                extra_skill_seq = [
                    ["AWS", "Terraform"],
                    ["Azure", "Kubernetes"],
                    ["React", "TypeScript"],
                    ["SAP S/4HANA"],
                    ["Databricks", "Snowflake"],
                ]
                extras = extra_skill_seq[(idx - 1) % len(extra_skill_seq)]
                skills = sorted(list(dict.fromkeys(base_skills + extras)))

                sp = User.objects.create_user(
                    id=sid,
                    name=full,
                    email=slug_email(full, domain),
                    password=PASSWORD,
                    role="Specialist",
                    provider=provider,
                    status="Active",
                    created_at=date(2023, 6, 1) + timedelta(days=idx * 7),
                    material_number=f"MAT-{pid}-{idx:04d}",
                    experience_level=exp,
                    technology_level=tech,
                    performance_grade=grade,
                    average_daily_rate=money(rate),
                    skills=skills,
                    availability="Available",
                    service_requests_completed=0,
                    service_orders_active=0,
                    is_active=True,
                    is_staff=False,
                )
                specialists.append(sp)

                log_event(
                    provider=provider,
                    actor_type="SYSTEM",
                    actor_user=None,
                    event_type="SPECIALIST_ONBOARDED",
                    entity_type="User",
                    entity_id=sp.id,
                    message=f"Specialist onboarded: {sp.name} ({role_title}, {exp}).",
                    metadata={
                        "userId": sp.id,
                        "experienceLevel": exp,
                        "technologyLevel": tech,
                        "avgDailyRate": float(rate),
                        "skills": skills,
                    },
                    at=aware(2023, 6, 10, 11, 0) + timedelta(days=idx),
                )

            # enforce exact counts
            expected = SPECIALISTS_COUNT[pid]
            if len(specialists) != expected:
                raise RuntimeError(f"{pid} specialists mismatch: expected={expected}, got={len(specialists)}")

            specialists_by_provider[pid] = specialists

        return users_by_provider, specialists_by_provider

    def _seed_contracts(self, providers: Dict[str, Provider], users_by_provider: Dict[str, List[User]]):
        contracts_by_provider: Dict[str, List[Contract]] = {pid: [] for pid in providers.keys()}
        open_contracts: List[Contract] = []

        # Deterministic contract IDs
        # P001: C001 active, C002 expired
        # P002: C003 active, C004 expired
        # P003: C005 active, C006 expired
        contract_defs = {
            "P001": [
                ("C001", "Framework Agreement IT Services – Application Operations & DevOps", "Active", date(2024, 8, 1), date(2026, 2, 28)),
                ("C002", "Framework Agreement QA & Test Automation", "Expired", date(2023, 5, 1), date(2024, 4, 30)),
            ],
            "P002": [
                ("C003", "Framework Agreement Cloud & Security Services", "Active", date(2024, 10, 1), date(2026, 6, 30)),
                ("C004", "Framework Agreement Infrastructure & Network Operations", "Expired", date(2023, 3, 1), date(2024, 2, 29)),
            ],
            "P003": [
                ("C005", "Framework Agreement Data Analytics & BI Services", "Active", date(2024, 7, 1), date(2026, 12, 31)),
                ("C006", "Framework Agreement UX/UI & Design Systems", "Expired", date(2023, 6, 1), date(2024, 5, 31)),
            ],
        }

        for pid, provider in providers.items():
            cc_user = next(u for u in users_by_provider[pid] if u.role == "Contract Coordinator")

            for cid, title, status, start, end in contract_defs[pid]:
                published_at = aware(2024, 4, 1, 9, 0) if status == "Active" else aware(2023, 2, 1, 9, 0)
                offer_deadline = published_at + timedelta(days=14)

                c = Contract.objects.create(
                    id=cid,
                    title=title,
                    status=status,
                    kind="Service",
                    published_at=published_at,
                    offer_deadline=offer_deadline,
                    start_date=start,
                    end_date=end,
                    scope_of_work=(
                        "Provision of IT professional services including implementation, operations, quality assurance, and documentation according to customer standards."
                    ),
                    terms_and_conditions=(
                        "Framework conditions apply (SLA, NDA, DPA/GDPR). Billing in EUR; daily rates according to pricing caps."
                    ),
                    functional_weight=60,
                    commercial_weight=40,
                    allowed_request_configs={
                        "Single": {"offerDeadlineDays": 5, "cycles": 1},
                        "Multi": {"offerDeadlineDays": 7, "cycles": 1},
                        "Team": {"offerDeadlineDays": 10, "cycles": 2},
                        "Work Contract": {"offerDeadlineDays": 12, "cycles": 2},
                    },
                    awarded_provider=provider,
                    accepted_request_types=["Single", "Multi", "Team", "Work Contract"],
                    allowed_domains=["Application Management", "Cloud", "Data", "Security", "SAP", "QA", "UX"],
                    allowed_roles=[r for r, _ in SPECIALIST_ROLE_POOL],
                    experience_levels=["Junior", "Mid", "Senior", "Expert"],
                    offer_cycles_and_deadlines=[
                        {"requestType": "Single", "cycle": "1", "deadline": "5 business days"},
                        {"requestType": "Team", "cycle": "1-2", "deadline": "10 business days"},
                    ],
                    pricing_limits=pricing_limits_fixed(),
                    version_history=version_history_fixed(active=(status == "Active")),
                )
                Contract.objects.filter(pk=c.pk).update(created_at=published_at - timedelta(days=2))

                award = ContractAward.objects.create(
                    contract=c,
                    provider=provider,
                    created_by_system=True,
                    note="Award granted after evaluation of functionality and commercial conditions.",
                )

                log_event(
                    provider=provider,
                    actor_type="USER",
                    actor_user=cc_user,
                    event_type="CONTRACT_PUBLISHED",
                    entity_type="Contract",
                    entity_id=c.id,
                    message=f"Contract {c.id} published.",
                    metadata={"contractId": c.id, "status": "Published"},
                    at=published_at,
                )
                log_event(
                    provider=provider,
                    actor_type="SYSTEM",
                    actor_user=None,
                    event_type="CONTRACT_AWARDED",
                    entity_type="Contract",
                    entity_id=c.id,
                    message=f"Contract {c.id} awarded to {provider.name}.",
                    metadata={"contractId": c.id, "providerId": provider.id, "awardId": award.id},
                    at=published_at + timedelta(days=7),
                )

                contracts_by_provider[pid].append(c)

        # Deterministic open tenders (not awarded)
        open_tenders = [
            ("C007", "Tender: Cloud Migration & Landing Zone", "Published", date(2026, 3, 1), date(2026, 9, 30)),
            ("C008", "Tender: SOC Operations & SIEM Use-Case Engineering", "In Negotiation", date(2026, 2, 15), date(2026, 8, 31)),
        ]
        for cid, title, status, start, end in open_tenders:
            published_at = aware(2025, 12, 1, 9, 0)
            offer_deadline = published_at + timedelta(days=18)

            c = Contract.objects.create(
                id=cid,
                title=title,
                status=status,
                kind="Service",
                published_at=published_at,
                offer_deadline=offer_deadline,
                start_date=start,
                end_date=end,
                scope_of_work="Tender for specialized services including workshops, implementation, handover to operations, and documentation.",
                terms_and_conditions="Pricing caps apply. Award based on functional/commercial weighting.",
                functional_weight=60,
                commercial_weight=40,
                allowed_request_configs={
                    "Single": {"offerDeadlineDays": 7, "cycles": 1},
                    "Team": {"offerDeadlineDays": 12, "cycles": 2},
                },
                awarded_provider=None,
                accepted_request_types=["Single", "Team"],
                allowed_domains=["Cloud", "Security"],
                allowed_roles=["Cloud Architect", "DevOps Engineer", "Cybersecurity Specialist", "Project Manager"],
                experience_levels=["Junior", "Mid", "Senior", "Expert"],
                offer_cycles_and_deadlines=[
                    {"requestType": "Single", "cycle": "1", "deadline": "7 business days"},
                    {"requestType": "Team", "cycle": "1-2", "deadline": "12 business days"},
                ],
                pricing_limits=pricing_limits_fixed(),
                version_history=version_history_fixed(active=True),
            )
            Contract.objects.filter(pk=c.pk).update(created_at=published_at - timedelta(days=2))
            open_contracts.append(c)

        # Deterministic contract offers for open tenders: each provider submits one
        for c in open_contracts:
            for pid, provider in providers.items():
                admin_user = next(u for u in users_by_provider[pid] if u.role == "Provider Admin")
                offer = ContractOffer.objects.create(
                    contract=c,
                    provider=provider,
                    created_by=admin_user,
                    status="Submitted",
                    proposed_daily_rate=money(980 if pid == "P001" else 1020 if pid == "P002" else 1050),
                    proposed_terms="Net payment term 30 days. Travel expenses at cost. Monthly reporting.",
                    note="Offer submitted according to the tender documents.",
                )
                ContractOffer.objects.filter(pk=offer.pk).update(submitted_at=c.published_at + timedelta(days=6))

                log_event(
                    provider=provider,
                    actor_type="USER",
                    actor_user=admin_user,
                    event_type="CONTRACT_OFFER_SUBMITTED",
                    entity_type="ContractOffer",
                    entity_id=offer.id,
                    message=f"Submitted contract offer for contract {c.id}.",
                    metadata={"contractId": c.id, "providerId": provider.id, "status": "Submitted"},
                    at=c.published_at + timedelta(days=6),
                )

        return contracts_by_provider, open_contracts

    def _seed_procurement(
        self,
        providers: Dict[str, Provider],
        users_by_provider: Dict[str, List[User]],
        specialists_by_provider: Dict[str, List[User]],
        contracts_by_provider: Dict[str, List[Contract]],
        open_contracts: List[Contract],
    ):
        sr_count = 0
        offer_count = 0
        order_count = 0
        change_req_count = 0

        specialist_stats = {sp.id: {"completed": 0, "active": 0} for pid in specialists_by_provider for sp in specialists_by_provider[pid]}

        # For each provider: seed SRs ONLY for their awarded contracts (Active/Expired)
        for pid, contract_list in contracts_by_provider.items():
            provider = providers[pid]
            supplier_rep = next(u for u in users_by_provider[pid] if u.role == "Supplier Representative")

            awarded_contracts = [c for c in contract_list if c.status in ["Active", "Expired"]]

            # Deterministic volume: 8 SR per contract => rich but stable
            for cidx, contract in enumerate(awarded_contracts, start=1):
                for local_i in range(1, 9):
                    sr_count += 1
                    sr_id = f"SR{sr_count:03d}"

                    sr_type = SR_TYPE_SEQ[(local_i - 1) % len(SR_TYPE_SEQ)]
                    role_title, _skills = SPECIALIST_ROLE_POOL[(local_i - 1) % len(SPECIALIST_ROLE_POOL)]
                    technology = SR_TECH_SEQ[(local_i - 1) % len(SR_TECH_SEQ)]
                    exp_level = EXP_SEQ[(local_i - 1) % len(EXP_SEQ)]

                    # Deterministic timeline across last 24 months
                    # spread: every SR is 21 days apart
                    base_dt = aware(2024, 2, 1, 10, 0) + timedelta(days=(sr_count - 1) * 21)
                    if base_dt.date() > TODAY:
                        # keep within range
                        base_dt = aware(2025, 12, 1, 10, 0) + timedelta(days=(local_i - 1) * 7)

                    start = base_dt.date() + timedelta(days=14)
                    duration_days = [5, 10, 20, 30, 60, 90, 120, 15][(local_i - 1) % 8]
                    end = start + timedelta(days=duration_days)

                    total_md = max(3, int(duration_days * 0.75))
                    onsite_days = int(total_md * (0.2 if LOC_SEQ[(local_i - 1) % len(LOC_SEQ)] in ["Hybrid", "Onsite"] else 0.0))

                    must_have = MUST_HAVE_SEQ[(local_i - 1) % len(MUST_HAVE_SEQ)]
                    nice_have = NICE_HAVE_SEQ[(local_i - 1) % len(NICE_HAVE_SEQ)]
                    perf_loc = LOC_SEQ[(local_i - 1) % len(LOC_SEQ)]
                    langs = REQ_LANG_SEQ[(local_i - 1) % len(REQ_LANG_SEQ)]

                    sr = ServiceRequest.objects.create(
                        id=sr_id,
                        title=f"{role_title} for {technology} – {['Implementation','Operations','Optimization','Migration'][ (local_i-1) % 4 ]}",
                        type=sr_type,
                        linked_contract_id=contract.id,
                        offer_deadline_at=base_dt + timedelta(days=7),
                        cycles=2 if sr_type in ["Team", "Work Contract"] else 1,
                        role=role_title,
                        technology=technology,
                        experience_level=exp_level,
                        start_date=start,
                        end_date=end,
                        total_man_days=total_md,
                        onsite_days=onsite_days,
                        performance_location=perf_loc,
                        required_languages=langs,
                        must_have_criteria=must_have,
                        nice_to_have_criteria=nice_have,
                        task_description=(
                            "Tasks: analysis, implementation, testing, documentation, and regular alignment meetings. "
                            "Deliverables according to the project plan and quality guidelines."
                        ),
                        status="Open",
                    )
                    ServiceRequest.objects.filter(pk=sr.pk).update(created_at=base_dt)

                    log_event(
                        provider=provider,
                        actor_type="GROUP3_SYSTEM",
                        actor_user=None,
                        event_type="SERVICE_REQUEST_RECEIVED",
                        entity_type="ServiceRequest",
                        entity_id=sr.id,
                        message=f"Service request {sr.id} received and opened.",
                        metadata={"serviceRequestId": sr.id, "contractId": contract.id, "type": sr.type},
                        at=base_dt,
                    )

                    # ✅ IMPORTANT: Offers ONLY from same provider => no N/A
                    offer_count += 1
                    o_provider = provider
                    o_creator = supplier_rep

                    # deterministic specialist selection: rotate
                    sp = specialists_by_provider[pid][(local_i - 1) % len(specialists_by_provider[pid])]

                    base_rate = float(sp.average_daily_rate or 700)
                    adj = {"Junior": 0.92, "Mid": 1.00, "Senior": 1.08, "Expert": 1.15}[exp_level]
                    daily_rate = int(base_rate * adj)

                    travel = 0
                    if perf_loc in ["Onsite", "Hybrid"] and onsite_days > 0:
                        travel = 80 if perf_loc == "Hybrid" else 110

                    total_cost = daily_rate * total_md + travel * onsite_days
                    submitted_at = base_dt + timedelta(days=3)

                    offer = ServiceOffer.objects.create(
                        service_request=sr,
                        provider=o_provider,
                        specialist=sp,
                        created_by=o_creator,
                        daily_rate=money(daily_rate),
                        travel_cost_per_onsite_day=money(travel),
                        total_cost=money(total_cost),
                        contractual_relationship="Employee",
                        subcontractor_company=None,
                        must_have_match_percentage=88 - (local_i % 6),
                        nice_to_have_match_percentage=78 - (local_i % 7),
                        status="Submitted",
                        submitted_at=submitted_at,
                    )
                    ServiceOffer.objects.filter(pk=offer.pk).update(created_at=base_dt + timedelta(hours=6))

                    log_event(
                        provider=o_provider,
                        actor_type="USER",
                        actor_user=o_creator,
                        event_type="SERVICE_OFFER_SUBMITTED",
                        entity_type="ServiceOffer",
                        entity_id=offer.id,
                        message=f"Offer {offer.id} submitted for service request {sr.id}.",
                        metadata={"serviceRequestId": sr.id, "offerId": offer.id, "dailyRate": daily_rate, "totalCost": float(total_cost)},
                        at=submitted_at,
                    )

                    # Deterministic outcomes:
                    # Every 5th SR is closed without order (budget/priority)
                    make_order = (sr_count % 5) != 0

                    if not make_order:
                        ServiceRequest.objects.filter(pk=sr.pk).update(status="Closed")
                        ServiceOffer.objects.filter(pk=offer.pk).update(status="Rejected")
                        log_event(
                            provider=provider,
                            actor_type="USER",
                            actor_user=supplier_rep,
                            event_type="SERVICE_REQUEST_CLOSED",
                            entity_type="ServiceRequest",
                            entity_id=sr.id,
                            message=f"Service request {sr.id} closed without award (budget/priority change).",
                            metadata={"serviceRequestId": sr.id, "reason": "Budget/priority change"},
                            at=base_dt + timedelta(days=14),
                        )
                        continue

                    # accept offer & create order
                    ServiceOffer.objects.filter(pk=offer.pk).update(status="Accepted")
                    log_event(
                        provider=o_provider,
                        actor_type="GROUP3_SYSTEM",
                        actor_user=None,
                        event_type="SERVICE_OFFER_ACCEPTED",
                        entity_type="ServiceOffer",
                        entity_id=offer.id,
                        message=f"Offer {offer.id} accepted for service request {sr.id}.",
                        metadata={"serviceRequestId": sr.id, "offerId": offer.id},
                        at=submitted_at + timedelta(days=2),
                    )

                    order_count += 1
                    order_created = base_dt + timedelta(days=8)

                    order = ServiceOrder.objects.create(
                        service_offer=offer,
                        service_request=sr,
                        provider=o_provider,
                        specialist=sp,
                        title=f"{sr.role} – {sr.technology} ({sr.type})",
                        start_date=sr.start_date,
                        end_date=sr.end_date,
                        location=sr.performance_location,
                        man_days=sr.total_man_days,
                        total_cost=offer.total_cost,
                        status="Active",
                    )
                    ServiceOrder.objects.filter(pk=order.pk).update(created_at=order_created)

                    ServiceRequest.objects.filter(pk=sr.pk).update(status="Closed")

                    log_event(
                        provider=o_provider,
                        actor_type="SYSTEM",
                        actor_user=None,
                        event_type="SERVICE_ORDER_CREATED",
                        entity_type="ServiceOrder",
                        entity_id=order.id,
                        message=f"Service order {order.id} created from accepted offer {offer.id}.",
                        metadata={"serviceOrderId": order.id, "serviceRequestId": sr.id, "contractId": sr.linked_contract_id},
                        at=order_created,
                    )

                    # invoice events (stored as ActivityLog metadata)
                    log_event(
                        provider=o_provider,
                        actor_type="SYSTEM",
                        actor_user=None,
                        event_type="INVOICE_CREATED",
                        entity_type="ServiceOrder",
                        entity_id=order.id,
                        message=f"Invoice created for service order {order.id}.",
                        metadata={"serviceOrderId": order.id, "invoiceStatus": "Invoiced", "amount": float(order.total_cost), "currency": "EUR"},
                        at=order_created + timedelta(days=21),
                    )
                    # deterministic payment: every 2nd order is paid
                    if (order.id % 2) == 0:
                        log_event(
                            provider=o_provider,
                            actor_type="SYSTEM",
                            actor_user=None,
                            event_type="INVOICE_PAID",
                            entity_type="ServiceOrder",
                            entity_id=order.id,
                            message=f"Invoice paid for service order {order.id}.",
                            metadata={"serviceOrderId": order.id, "invoiceStatus": "Paid", "amount": float(order.total_cost), "currency": "EUR"},
                            at=order_created + timedelta(days=49),
                        )

                    # deterministic completion if end date is in the past
                    if sr.end_date and sr.end_date < TODAY:
                        ServiceOrder.objects.filter(pk=order.pk).update(status="Completed")
                        specialist_stats[sp.id]["completed"] += 1
                        log_event(
                            provider=o_provider,
                            actor_type="SYSTEM",
                            actor_user=None,
                            event_type="SERVICE_ORDER_COMPLETED",
                            entity_type="ServiceOrder",
                            entity_id=order.id,
                            message=f"Service order {order.id} completed.",
                            metadata={"serviceOrderId": order.id, "status": "Completed"},
                            at=aware(sr.end_date.year, sr.end_date.month, sr.end_date.day, 16, 0),
                        )
                    else:
                        specialist_stats[sp.id]["active"] += 1

                    # deterministic change requests: every 7th order gets an Extension CR (Approved)
                    if (order.id % 7) == 0:
                        change_req_count += 1
                        provider_user = supplier_rep
                        decided_by = next(u for u in users_by_provider[pid] if u.role == "Contract Coordinator")

                        cr = ServiceOrderChangeRequest.objects.create(
                            service_order=order,
                            provider=o_provider,
                            type="Extension",
                            status="Approved",
                            created_by_system=False,
                            created_by_user=provider_user,
                            decided_by_user=decided_by,
                            reason="Customer requests additional support due to timeline shift.",
                            provider_response_note="Approved according to framework conditions and capacity check.",
                            new_end_date=(order.end_date + timedelta(days=20)) if order.end_date else None,
                            additional_man_days=10,
                            new_total_cost=(order.total_cost + money(10 * daily_rate)),
                            decided_at=order_created + timedelta(days=12),
                        )
                        ServiceOrderChangeRequest.objects.filter(pk=cr.pk).update(created_at=order_created + timedelta(days=10))

                        log_event(
                            provider=o_provider,
                            actor_type="USER",
                            actor_user=provider_user,
                            event_type="SERVICE_ORDER_CHANGE_REQUEST_CREATED",
                            entity_type="ServiceOrderChangeRequest",
                            entity_id=cr.id,
                            message=f"Change request {cr.id} (Extension) created for order {order.id}.",
                            metadata={"serviceOrderId": order.id, "changeRequestId": cr.id, "type": "Extension"},
                            at=order_created + timedelta(days=10),
                        )
                        log_event(
                            provider=o_provider,
                            actor_type="USER",
                            actor_user=decided_by,
                            event_type="SERVICE_ORDER_CHANGE_REQUEST_DECIDED",
                            entity_type="ServiceOrderChangeRequest",
                            entity_id=cr.id,
                            message=f"Change request {cr.id} decided: Approved.",
                            metadata={"serviceOrderId": order.id, "changeRequestId": cr.id, "status": "Approved"},
                            at=order_created + timedelta(days=12),
                        )

        # update specialist counters
        for pid, sps in specialists_by_provider.items():
            for sp in sps:
                comp = specialist_stats[sp.id]["completed"]
                act = specialist_stats[sp.id]["active"]
                User.objects.filter(pk=sp.pk).update(
                    service_requests_completed=comp,
                    service_orders_active=act,
                    availability=("Fully Booked" if act >= 2 else ("Partially Booked" if act == 1 else "Available")),
                )

        return {
            "service_requests": sr_count,
            "service_offers": offer_count,
            "service_orders": order_count,
            "change_requests": change_req_count,
            "activity_logs": ActivityLog.objects.count(),
            "date_range": (START_RANGE, TODAY),
        }

    def _print_summary(self, providers, users_by_provider, specialists_by_provider, contracts_by_provider, stats):
        self.stdout.write("========== DETERMINISTIC DEMO DATA SUMMARY ==========")
        self.stdout.write("Providers created:")
        for pid, p in providers.items():
            self.stdout.write(f" - {pid}: {p.name}")

        self.stdout.write("\nUsers per provider (roles):")
        for pid, users in users_by_provider.items():
            self.stdout.write(f" - {pid}:")
            for u in users:
                self.stdout.write(f"    • {u.role}: {u.id} | {u.email} | password={PASSWORD}")

        self.stdout.write("\nSpecialists per provider:")
        for pid, sps in specialists_by_provider.items():
            self.stdout.write(f" - {pid}: {len(sps)} specialists")

        self.stdout.write("\nContracts:")
        total_contracts = 0
        for pid, contracts in contracts_by_provider.items():
            total_contracts += len(contracts)
            self.stdout.write(f" - {pid}: {len(contracts)} awarded contracts (Active/Expired mix)")
        self.stdout.write(f"Total contracts seeded: {total_contracts + 2} (includes 2 open bidding contracts)")

        self.stdout.write("\nProcurement volume:")
        self.stdout.write(f" - Service Requests: {stats['service_requests']}")
        self.stdout.write(f" - Service Offers:   {stats['service_offers']}")
        self.stdout.write(f" - Service Orders:   {stats['service_orders']}")
        self.stdout.write(f" - Change Requests:  {stats['change_requests']}")
        self.stdout.write(f" - Activity Logs:    {stats['activity_logs']}")

        d0, d1 = stats["date_range"]
        self.stdout.write(f"\nDate range covered: {d0.isoformat()} → {d1.isoformat()}")

        self.stdout.write("\nRate ranges (EUR/day):")
        self.stdout.write(" - Junior: 520")
        self.stdout.write(" - Mid: 690")
        self.stdout.write(" - Senior: 890")
        self.stdout.write(" - Expert: 1080")
        self.stdout.write("=======================================\n")
