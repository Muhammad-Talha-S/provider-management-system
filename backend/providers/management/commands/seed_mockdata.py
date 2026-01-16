import random
import math
from datetime import date, datetime, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

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


# ---------------------------
# Config
# ---------------------------

SEED = 42
PASSWORD = "login123"

TODAY = date(2026, 1, 15)  # per your project date context
START_RANGE = TODAY - timedelta(days=730)  # ~24 months

GER_CITIES = [
    "Berlin", "Hamburg", "München", "Köln", "Frankfurt am Main", "Stuttgart",
    "Düsseldorf", "Leipzig", "Dresden", "Nürnberg", "Bremen", "Hannover",
    "Mannheim", "Karlsruhe", "Augsburg", "Wiesbaden", "Bonn"
]

GER_FIRST = [
    "Anna", "Lena", "Mia", "Laura", "Hannah", "Sophia", "Lea", "Marie", "Nina", "Julia",
    "Max", "Felix", "Jonas", "Lukas", "Noah", "Leon", "Paul", "Tim", "Moritz", "Jan",
    "Katharina", "Sarah", "Johanna", "Eva", "Clara", "David", "Daniel", "Michael", "Thomas", "Andreas"
]
GER_LAST = [
    "Schmidt", "Müller", "Weber", "Wagner", "Becker", "Hoffmann", "Schäfer", "Koch", "Bauer", "Richter",
    "Klein", "Wolf", "Neumann", "Schwarz", "Zimmermann", "Braun", "Krüger", "Hartmann", "Lange", "Schmitt"
]

SPECIALIST_ROLES = [
    ("IT Consultant", ["ITIL", "Stakeholder Mgmt", "Requirements", "MS Office"]),
    ("Project Manager", ["Prince2", "Scrum", "MS Project", "Risk Mgmt"]),
    ("Data Analyst", ["SQL", "Power BI", "Python", "Data Modelling"]),
    ("DevOps Engineer", ["Docker", "Kubernetes", "Terraform", "CI/CD"]),
    ("Cybersecurity Specialist", ["IAM", "SIEM", "Threat Modelling", "ISO 27001"]),
    ("SAP Consultant", ["SAP MM", "SAP SD", "SAP FI", "S/4HANA"]),
    ("QA Engineer", ["Test Automation", "Cypress", "JUnit", "Test Design"]),
    ("UX Designer", ["Figma", "User Research", "Prototyping", "Design Systems"]),
    ("Backend Engineer", ["Python", "Django", "PostgreSQL", "API Design"]),
    ("Cloud Architect", ["AWS", "Azure", "Networking", "Security"])
]

REQ_LANGS = [["German"], ["German", "English"], ["English", "German"], ["English"]]

# --- CHANGED: German sentences -> English sentences (content only; names/addresses untouched) ---
MUST_HAVE_POOL = [
    "At least 3 years of project experience",
    "Experience in agile teams (Scrum/Kanban)",
    "Fluent German language skills (C1)",
    "Experience in regulated environments",
    "Stakeholder management",
    "Documentation according to internal standards",
    "Hands-on implementation experience",
]
NICE_HAVE_POOL = [
    "Experience in the automotive industry",
    "Knowledge of ITIL/COBIT",
    "Cloud experience (AWS/Azure)",
    "Certifications (Scrum Master, Prince2)",
    "Knowledge of SAP S/4HANA",
    "Experience with data governance",
]

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

EXP_RATE_BANDS = {
    "Junior": (420, 560),
    "Mid": (560, 780),
    "Senior": (780, 980),
    "Expert": (950, 1200),
}

TECH_LEVEL_BY_EXP = {
    "Junior": ["Basic", "Intermediate"],
    "Mid": ["Intermediate", "Advanced"],
    "Senior": ["Advanced", "Expert"],
    "Expert": ["Expert"],
}

GRADE_BY_EXP = {
    "Junior": ["B", "C"],
    "Mid": ["A", "B"],
    "Senior": ["A", "B"],
    "Expert": ["A"],
}

AVAIL_POOL = ["Available", "Partially Booked", "Fully Booked"]


# ---------------------------
# Helpers
# ---------------------------

def rand_date(d0: date, d1: date) -> date:
    """Random date between d0 and d1 inclusive."""
    if d1 <= d0:
        return d0
    delta = (d1 - d0).days
    return d0 + timedelta(days=random.randint(0, delta))

def rand_dt(d0: date, d1: date) -> datetime:
    dd = rand_date(d0, d1)
    # random time during business hours
    hh = random.randint(8, 18)
    mm = random.choice([0, 15, 30, 45])
    return timezone.make_aware(datetime(dd.year, dd.month, dd.day, hh, mm))

def slug_email(first: str, last: str, domain: str) -> str:
    # German umlaut handling simplified (enough for demo)
    repl = {
        "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss",
        "Ä": "ae", "Ö": "oe", "Ü": "ue",
    }
    def clean(s: str) -> str:
        for k, v in repl.items():
            s = s.replace(k, v)
        return s.lower().replace(" ", "").replace("-", "")
    return f"{clean(first)}.{clean(last)}@{domain}"

def pick_name(used):
    for _ in range(2000):
        first = random.choice(GER_FIRST)
        last = random.choice(GER_LAST)
        full = f"{first} {last}"
        if full not in used:
            used.add(full)
            return first, last, full
    # fallback
    return "Max", f"Mustermann{len(used)}", f"Max Mustermann{len(used)}"

def log_event(provider, actor_type, actor_user, event_type, entity_type, entity_id, message, metadata=None, at=None):
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

def money(x) -> Decimal:
    return Decimal(str(round(float(x), 2)))

def contract_pricing_limits():
    # pricing grid similar to your Figma expectations
    limits = []
    for role in ["IT Consultant", "Project Manager", "Data Analyst", "DevOps Engineer", "SAP Consultant", "Cybersecurity Specialist"]:
        for exp in ["Junior", "Mid", "Senior", "Expert"]:
            lo, hi = EXP_RATE_BANDS[exp]
            max_rate = random.randint(lo + 30, hi + 50)
            limits.append({
                "role": role,
                "experienceLevel": exp,
                "technologyLevel": random.choice(["Basic", "Intermediate", "Advanced", "Expert"]),
                "maxRate": float(max_rate),
            })
    return limits

def contract_version_history(active=True):
    base = [
        {"version": 1, "date": "2024-03-15", "status": "Proposed", "changes": "Initial framework agreement draft.", "documentLink": None},
        {"version": 2, "date": "2024-04-05", "status": "Proposed", "changes": "Updated SLA and reporting obligations.", "documentLink": None},
        {"version": 3, "date": "2024-04-20", "status": "Signed", "changes": "Signed framework with pricing caps.", "documentLink": None},
    ]
    if not active:
        base.append({"version": 4, "date": "2025-06-30", "status": "Signed", "changes": "Contract completed / closed after end date.", "documentLink": None})
    return base


# ---------------------------
# Main seeder
# ---------------------------

class Command(BaseCommand):
    help = "Seed Germany-based realistic demo data for Providers, Users, Contracts, Procurement flow, and Activity Logs."

    @transaction.atomic
    def handle(self, *args, **options):
        random.seed(SEED)

        self.stdout.write(self.style.WARNING("⚠️  Wiping existing data (safe for empty DB, also re-runnable)..."))
        self._wipe()

        self.stdout.write(self.style.WARNING("🌱 Seeding Providers, Users, Specialists..."))
        providers = self._seed_providers()
        users_by_provider, specialists_by_provider = self._seed_users(providers)

        self.stdout.write(self.style.WARNING("📄 Seeding Contracts (+ awards + some open contracts)..."))
        contracts_by_provider, open_contracts = self._seed_contracts(providers, users_by_provider)

        self.stdout.write(self.style.WARNING("🧾 Seeding Procurement flow: ServiceRequests → Offers → Orders (+ change requests)..."))
        stats = self._seed_procurement(
            providers=providers,
            users_by_provider=users_by_provider,
            specialists_by_provider=specialists_by_provider,
            contracts_by_provider=contracts_by_provider,
            open_contracts=open_contracts,
        )

        self.stdout.write(self.style.SUCCESS("✅ Seeding completed successfully.\n"))
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

    def _seed_providers(self):
        result = {}
        for p in PROVIDERS:
            provider = Provider.objects.create(
                id=p["id"],
                name=p["name"],
                contact_name=p["contact_name"],
                contact_email=p["contact_email"],
                contact_phone=p["contact_phone"],
                address=p["address"],
                email_notifications=True,
                sms_notifications=random.choice([False, True]),
                preferred_language=p["preferred_language"],
                status="Active",
                created_at=p["created_at"],
            )
            result[provider.id] = provider

            log_event(
                provider=provider,
                actor_type="SYSTEM",
                actor_user=None,
                event_type="PROVIDER_CREATED",
                entity_type="Provider",
                entity_id=provider.id,
                message=f"Provider '{provider.name}' onboarded.",
                metadata={"providerId": provider.id, "name": provider.name},
                at=rand_dt(START_RANGE, TODAY - timedelta(days=600)),
            )
        return result

    def _seed_users(self, providers):
        used_names = set()
        users_by_provider = {}
        specialists_by_provider = {}

        for pid, provider in providers.items():
            domain = DOMAIN_BY_PROVIDER[pid]

            # Role users (1 each)
            role_users = []
            role_specs = [
                ("Provider Admin", True),
                ("Supplier Representative", False),
                ("Contract Coordinator", False),
            ]
            for idx, (role, is_staff) in enumerate(role_specs, start=1):
                first, last, full = pick_name(used_names)
                uid = f"U{pid[-1]}{idx:02d}"  # e.g. U101
                user = User.objects.create_user(
                    id=uid,
                    name=full,
                    email=slug_email(first, last, domain),
                    password=PASSWORD,
                    role=role,
                    provider=provider,
                    status="Active",
                    created_at=rand_date(date(2023, 1, 1), TODAY - timedelta(days=30)),
                    is_active=True,
                    is_staff=is_staff,
                )
                role_users.append(user)

                log_event(
                    provider=provider,
                    actor_type="SYSTEM",
                    actor_user=None,
                    event_type="USER_CREATED",
                    entity_type="User",
                    entity_id=user.id,
                    message=f"Account created for {user.role}: {user.name}.",
                    metadata={"userId": user.id, "role": user.role, "email": user.email},
                    at=rand_dt(START_RANGE, TODAY - timedelta(days=500)),
                )

            users_by_provider[pid] = role_users

            # Specialists
            specialists = []
            n = SPECIALISTS_COUNT[pid]
            for i in range(1, n + 1):
                first, last, full = pick_name(used_names)
                sid = f"SP{pid[-1]}{i:03d}"  # e.g. SP1001

                exp = random.choices(
                    ["Junior", "Mid", "Senior", "Expert"],
                    weights=[0.25, 0.35, 0.28, 0.12],
                    k=1
                )[0]
                tech = random.choice(TECH_LEVEL_BY_EXP[exp])
                grade = random.choice(GRADE_BY_EXP[exp])
                lo, hi = EXP_RATE_BANDS[exp]
                rate = random.randint(lo, hi)

                role_title, base_skills = random.choice(SPECIALIST_ROLES)
                extra_skills = random.sample(
                    ["Azure", "AWS", "GCP", "Kafka", "Databricks", "Snowflake", "Tableau", "React", "TypeScript", "Java", "Spring", "FastAPI"],
                    k=random.randint(1, 3),
                )
                skills = sorted(list(set(base_skills + extra_skills)))

                created_at = rand_date(date(2023, 1, 1), TODAY - timedelta(days=10))
                availability = random.choices(AVAIL_POOL, weights=[0.55, 0.35, 0.10], k=1)[0]

                sp = User.objects.create_user(
                    id=sid,
                    name=full,
                    email=slug_email(first, last, domain),
                    password=PASSWORD,
                    role="Specialist",
                    provider=provider,
                    status="Active",
                    created_at=created_at,

                    material_number=f"MAT-{pid}-{i:04d}",
                    experience_level=exp,
                    technology_level=tech,
                    performance_grade=grade,
                    average_daily_rate=money(rate),
                    skills=skills,
                    availability=availability,
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
                    at=rand_dt(START_RANGE, TODAY - timedelta(days=450)),
                )

            specialists_by_provider[pid] = specialists

        return users_by_provider, specialists_by_provider

    def _seed_contracts(self, providers, users_by_provider):
        contracts_by_provider = {pid: [] for pid in providers.keys()}
        open_contracts = []

        # Each provider: 2 awarded contracts (1 active, 1 expired)
        c_counter = 1

        for pid, provider in providers.items():
            admin_user = next(u for u in users_by_provider[pid] if u.role == "Provider Admin")
            cc_user = next(u for u in users_by_provider[pid] if u.role == "Contract Coordinator")

            # Active contract
            c_id = f"C{c_counter:03d}"; c_counter += 1
            start = rand_date(TODAY - timedelta(days=420), TODAY - timedelta(days=120))
            end = start + timedelta(days=random.randint(180, 540))

            contract = Contract.objects.create(
                id=c_id,
                title=random.choice([
                    "Framework Agreement IT Services – Application Operations & DevOps",
                    "Framework Agreement Cloud & Security Services",
                    "Framework Agreement Data Analytics & BI Services",
                    "Framework Agreement SAP Consulting & Customization",
                ]),
                status="Active",
                kind="Service",
                published_at=rand_dt(START_RANGE, start - timedelta(days=40)),
                offer_deadline=rand_dt(start - timedelta(days=30), start - timedelta(days=10)),
                start_date=start,
                end_date=end,
                # --- CHANGED ---
                scope_of_work="Provision of IT professional services including implementation, operations, quality assurance, and documentation according to customer standards.",
                # --- CHANGED ---
                terms_and_conditions="The framework conditions according to SLA, NDA, and data protection agreement apply. Billing in EUR; daily rates according to the pricing caps.",
                functional_weight=random.choice([50, 55, 60]),
                commercial_weight=random.choice([40, 45, 50]),
                allowed_request_configs={
                    "Single": {"offerDeadlineDays": 5, "cycles": 1},
                    "Multi": {"offerDeadlineDays": 7, "cycles": 1},
                    "Team": {"offerDeadlineDays": 10, "cycles": 2},
                    "Work Contract": {"offerDeadlineDays": 12, "cycles": 2},
                },
                awarded_provider=provider,
                accepted_request_types=["Single", "Multi", "Team", "Work Contract"],
                allowed_domains=["Application Management", "Cloud", "Data", "Security", "SAP"],
                allowed_roles=["IT Consultant", "Project Manager", "Data Analyst", "DevOps Engineer", "SAP Consultant", "Cybersecurity Specialist", "QA Engineer", "UX Designer"],
                experience_levels=["Junior", "Mid", "Senior", "Expert"],
                offer_cycles_and_deadlines=[
                    {"requestType": "Single", "cycle": "1", "deadline": "5 business days"},
                    {"requestType": "Team", "cycle": "1-2", "deadline": "10 business days"},
                ],
                pricing_limits=contract_pricing_limits(),
                version_history=contract_version_history(active=True),
            )
            # make created_at realistic
            Contract.objects.filter(pk=contract.pk).update(created_at=rand_dt(START_RANGE, start - timedelta(days=50)))

            award = ContractAward.objects.create(
                contract=contract,
                provider=provider,
                created_by_system=True,
                # --- CHANGED ---
                note="Award granted after evaluation of functionality and commercial conditions.",
            )

            log_event(provider, "USER", cc_user, "CONTRACT_PUBLISHED", "Contract", contract.id,
                      f"Contract {contract.id} published for bidding window.",
                      metadata={"contractId": contract.id, "status": "Published"},
                      at=contract.published_at)

            log_event(provider, "SYSTEM", None, "CONTRACT_AWARDED", "Contract", contract.id,
                      f"Contract {contract.id} awarded to {provider.name}.",
                      metadata={"contractId": contract.id, "providerId": provider.id, "awardId": award.id},
                      at=rand_dt(start - timedelta(days=15), start - timedelta(days=5)))

            contracts_by_provider[pid].append(contract)

            # Expired contract
            c_id = f"C{c_counter:03d}"; c_counter += 1
            start2 = rand_date(TODAY - timedelta(days=720), TODAY - timedelta(days=520))
            end2 = start2 + timedelta(days=random.randint(180, 360))

            contract2 = Contract.objects.create(
                id=c_id,
                title=random.choice([
                    "Framework Agreement QA & Test Automation",
                    "Framework Agreement Infrastructure & Network Operations",
                    "Framework Agreement UX/UI & Design Systems",
                ]),
                status="Expired",
                kind="Service",
                published_at=rand_dt(START_RANGE, start2 - timedelta(days=45)),
                offer_deadline=rand_dt(start2 - timedelta(days=30), start2 - timedelta(days=10)),
                start_date=start2,
                end_date=end2,
                # --- CHANGED ---
                scope_of_work="Service description according to the framework agreement, including deliverables, test concepts, operations manuals, and coordination meetings.",
                # --- CHANGED ---
                terms_and_conditions="Billing based on delivered man-days. Travel expenses by agreement. Confidentiality and GDPR compliance are mandatory.",
                functional_weight=random.choice([50, 60]),
                commercial_weight=random.choice([40, 50]),
                allowed_request_configs={
                    "Single": {"offerDeadlineDays": 5, "cycles": 1},
                    "Team": {"offerDeadlineDays": 10, "cycles": 2},
                },
                awarded_provider=provider,
                accepted_request_types=["Single", "Team"],
                allowed_domains=["QA", "Infrastructure", "UX"],
                allowed_roles=["QA Engineer", "UX Designer", "DevOps Engineer", "IT Consultant"],
                experience_levels=["Junior", "Mid", "Senior", "Expert"],
                offer_cycles_and_deadlines=[
                    {"requestType": "Single", "cycle": "1", "deadline": "5 business days"},
                    {"requestType": "Team", "cycle": "1-2", "deadline": "10 business days"},
                ],
                pricing_limits=contract_pricing_limits(),
                version_history=contract_version_history(active=False),
            )
            Contract.objects.filter(pk=contract2.pk).update(created_at=rand_dt(START_RANGE, start2 - timedelta(days=60)))

            award2 = ContractAward.objects.create(
                contract=contract2,
                provider=provider,
                created_by_system=True,
                # --- CHANGED ---
                note="Award granted as part of the multi-year agreement.",
            )

            log_event(provider, "SYSTEM", None, "CONTRACT_AWARDED", "Contract", contract2.id,
                      f"Contract {contract2.id} awarded to {provider.name}.",
                      metadata={"contractId": contract2.id, "providerId": provider.id, "awardId": award2.id},
                      at=rand_dt(start2 - timedelta(days=15), start2 - timedelta(days=5)))

            contracts_by_provider[pid].append(contract2)

        # Add 2 open contracts (Published / In Negotiation) not yet awarded => multiple providers can submit ContractOffers
        for _ in range(2):
            c_id = f"C{c_counter:03d}"; c_counter += 1
            published = rand_dt(TODAY - timedelta(days=120), TODAY - timedelta(days=10))
            offer_deadline = published + timedelta(days=random.randint(7, 18))

            contract = Contract.objects.create(
                id=c_id,
                title=random.choice([
                    "Tender: Cloud Migration & Landing Zone",
                    "Tender: Data Platform Modernization (Lakehouse)",
                    "Tender: SOC Operations & SIEM Use-Case Engineering",
                ]),
                status=random.choice(["Published", "In Negotiation"]),
                kind="Service",
                published_at=published,
                offer_deadline=offer_deadline,
                start_date=rand_date(TODAY + timedelta(days=15), TODAY + timedelta(days=60)),
                end_date=rand_date(TODAY + timedelta(days=200), TODAY + timedelta(days=520)),
                # --- CHANGED ---
                scope_of_work="Tender for specialized services including workshops, implementation, handover to operations, and documentation.",
                # --- CHANGED ---
                terms_and_conditions="Pricing caps according to the matrix. Award based on functional/commercial weighting.",
                functional_weight=60,
                commercial_weight=40,
                allowed_request_configs={
                    "Single": {"offerDeadlineDays": 7, "cycles": 1},
                    "Team": {"offerDeadlineDays": 12, "cycles": 2},
                },
                awarded_provider=None,
                accepted_request_types=["Single", "Team"],
                allowed_domains=["Cloud", "Data", "Security"],
                allowed_roles=["Cloud Architect", "DevOps Engineer", "Data Analyst", "Cybersecurity Specialist", "Project Manager"],
                experience_levels=["Junior", "Mid", "Senior", "Expert"],
                offer_cycles_and_deadlines=[
                    {"requestType": "Single", "cycle": "1", "deadline": "7 business days"},
                    {"requestType": "Team", "cycle": "1-2", "deadline": "12 business days"},
                ],
                pricing_limits=contract_pricing_limits(),
                version_history=contract_version_history(active=True),
            )
            Contract.objects.filter(pk=contract.pk).update(created_at=published - timedelta(days=2))
            open_contracts.append(contract)

        # Contract offers for open contracts: each provider submits 1 offer
        for contract in open_contracts:
            for pid, provider in providers.items():
                admin_user = next(u for u in users_by_provider[pid] if u.role == "Provider Admin")
                offer = ContractOffer.objects.create(
                    contract=contract,
                    provider=provider,
                    created_by=admin_user,
                    status="Submitted",
                    proposed_daily_rate=money(random.randint(680, 1100)),
                    # --- CHANGED ---
                    proposed_terms="Net payment term 30 days. Travel expenses at cost. Monthly reporting.",
                    # --- CHANGED ---
                    note="Offer submitted according to the tender documents.",
                )
                ContractOffer.objects.filter(pk=offer.pk).update(submitted_at=rand_dt(contract.published_at.date(), contract.offer_deadline.date()))

                log_event(
                    provider=provider,
                    actor_type="USER",
                    actor_user=admin_user,
                    event_type="CONTRACT_OFFER_SUBMITTED",
                    entity_type="ContractOffer",
                    entity_id=offer.id,
                    message=f"Submitted contract offer for contract {contract.id}.",
                    metadata={"contractId": contract.id, "providerId": provider.id, "status": "Submitted"},
                    at=rand_dt(contract.published_at.date(), contract.offer_deadline.date())
                )

        return contracts_by_provider, open_contracts

    def _seed_procurement(self, providers, users_by_provider, specialists_by_provider, contracts_by_provider, open_contracts):
        # We generate SRs across last 24 months for each provider's awarded contracts.
        # Some will be completed, some active, some closed without an order.
        sr_count = 0
        offer_count = 0
        order_count = 0
        change_req_count = 0

        # We'll also update specialist counters at the end.
        specialist_stats = {sp.id: {"completed": 0, "active": 0} for pid in specialists_by_provider for sp in specialists_by_provider[pid]}

        # Build a pool of contracts usable for SRs (only Active/Expired are awarded to provider)
        awarded_contracts = []
        for pid, contracts in contracts_by_provider.items():
            for c in contracts:
                if c.status in ["Active", "Expired"]:
                    awarded_contracts.append((pid, c))

        for pid, contract in awarded_contracts:
            provider = providers[pid]
            supplier_rep = next(u for u in users_by_provider[pid] if u.role == "Supplier Representative")

            # SR volume per contract
            num_srs = random.randint(6, 10)
            for _ in range(num_srs):
                sr_count += 1
                sr_id = f"SR{sr_count:03d}"

                sr_type = random.choice(["Single", "Multi", "Team", "Work Contract"])
                role_title, _skills = random.choice(SPECIALIST_ROLES)
                technology = random.choice(["AWS", "Azure", "Kubernetes", "SAP S/4HANA", "Python/Django", "Data Platform", "SIEM", "React/TypeScript"])
                exp_level = random.choice(["Junior", "Mid", "Senior", "Expert"])

                # timeline: SR created within contract validity, else around last 24m
                sr_created = rand_dt(START_RANGE, TODAY - timedelta(days=10))
                start = rand_date(sr_created.date() + timedelta(days=7), sr_created.date() + timedelta(days=45))
                # duration variation
                duration_days = random.choice([3, 5, 10, 15, 20, 30, 60, 90, 120])
                end = start + timedelta(days=duration_days)

                total_md = max(1, int(duration_days * random.uniform(0.6, 1.0)))
                onsite_days = int(total_md * random.choice([0, 0.1, 0.2, 0.3]))

                must_have = random.sample(MUST_HAVE_POOL, k=random.randint(2, 4))
                nice_have = random.sample(NICE_HAVE_POOL, k=random.randint(1, 3))

                sr = ServiceRequest.objects.create(
                    id=sr_id,
                    title=f"{role_title} for {technology} – {random.choice(['Implementation', 'Operations', 'Optimization', 'Migration', 'Rollout'])}",
                    type=sr_type,
                    linked_contract_id=contract.id,
                    offer_deadline_at=sr_created + timedelta(days=random.randint(5, 12)),
                    cycles=2 if sr_type in ["Team", "Work Contract"] else 1,
                    role=role_title,
                    technology=technology,
                    experience_level=exp_level,
                    start_date=start,
                    end_date=end,
                    total_man_days=total_md,
                    onsite_days=onsite_days,
                    performance_location=random.choice(["Onshore", "Onsite", "Hybrid"]),
                    required_languages=random.choice(REQ_LANGS),
                    must_have_criteria=must_have,
                    nice_to_have_criteria=nice_have,
                    # --- CHANGED ---
                    task_description=(
                        "Tasks: analysis, implementation, testing, documentation, and regular alignment meetings. "
                        "Deliverables according to the project plan and quality guidelines."
                    ),
                    status="Open",
                )
                # set created_at realistic
                ServiceRequest.objects.filter(pk=sr.pk).update(created_at=sr_created)

                log_event(
                    provider=provider,
                    actor_type="GROUP3_SYSTEM",
                    actor_user=None,
                    event_type="SERVICE_REQUEST_RECEIVED",
                    entity_type="ServiceRequest",
                    entity_id=sr.id,
                    message=f"Service request {sr.id} received and opened.",
                    metadata={"serviceRequestId": sr.id, "contractId": contract.id, "type": sr.type},
                    at=sr_created
                )

                # Create offers: 2-3 providers submit
                offering_providers = [pid]
                accepted_offer = None

                for opid in offering_providers:
                    offer_count += 1
                    o_provider = providers[opid]
                    # created_by: supplier rep of that provider
                    o_creator = next(u for u in users_by_provider[opid] if u.role == "Supplier Representative")

                    # choose specialist from that provider matching experience roughly
                    sp_candidates = specialists_by_provider[opid]
                    sp = random.choice(sp_candidates)

                    # daily rate around specialist avg + adjust to SR exp requirement
                    base_rate = float(sp.average_daily_rate or 700)
                    adj = {
                        "Junior": 0.92,
                        "Mid": 1.00,
                        "Senior": 1.08,
                        "Expert": 1.15,
                    }[exp_level]
                    daily_rate = max(350, int(base_rate * adj * random.uniform(0.95, 1.08)))

                    travel = 0
                    if sr.performance_location in ["Onsite", "Hybrid"] and onsite_days > 0:
                        travel = random.choice([40, 60, 80, 110])

                    total_cost = daily_rate * total_md + travel * onsite_days

                    offer = ServiceOffer.objects.create(
                        service_request=sr,
                        provider=o_provider,
                        specialist=sp,
                        created_by=o_creator,
                        daily_rate=money(daily_rate),
                        travel_cost_per_onsite_day=money(travel),
                        total_cost=money(total_cost),
                        contractual_relationship=random.choice(["Employee", "Freelancer", "Subcontractor"]),
                        subcontractor_company=(random.choice(["", "Freelance Partner GmbH", "IT Subcontracting KG"]) or None),
                        must_have_match_percentage=random.randint(70, 98),
                        nice_to_have_match_percentage=random.randint(55, 95),
                        status="Submitted",
                        submitted_at=sr_created + timedelta(days=random.randint(1, 6)),
                    )
                    ServiceOffer.objects.filter(pk=offer.pk).update(created_at=sr_created + timedelta(hours=random.randint(4, 40)))

                    log_event(
                        provider=o_provider,
                        actor_type="USER",
                        actor_user=o_creator,
                        event_type="SERVICE_OFFER_SUBMITTED",
                        entity_type="ServiceOffer",
                        entity_id=offer.id,
                        message=f"Offer {offer.id} submitted for service request {sr.id}.",
                        metadata={"serviceRequestId": sr.id, "offerId": offer.id, "dailyRate": daily_rate, "totalCost": float(total_cost)},
                        at=offer.submitted_at or sr_created
                    )

                    # pick one accepted offer (prefer provider that owns the contract, but not always)
                    if accepted_offer is None:
                        accepted_offer = offer
                    else:
                        # cost/quality trade-off: sometimes accept best score, sometimes lowest cost
                        if random.random() < 0.55:
                            if offer.total_cost < accepted_offer.total_cost:
                                accepted_offer = offer
                        else:
                            if offer.must_have_match_percentage > accepted_offer.must_have_match_percentage:
                                accepted_offer = offer

                # Decide outcome: most SRs lead to an order, some close without order
                make_order = random.random() < 0.86

                if not make_order:
                    # close SR without order
                    ServiceRequest.objects.filter(pk=sr.pk).update(status="Closed")
                    log_event(
                        provider=provider,
                        actor_type="USER",
                        actor_user=supplier_rep,
                        event_type="SERVICE_REQUEST_CLOSED",
                        entity_type="ServiceRequest",
                        entity_id=sr.id,
                        message=f"Service request {sr.id} closed without award (budget/priority change).",
                        metadata={"serviceRequestId": sr.id, "reason": "Budget/priority change"},
                        at=sr_created + timedelta(days=random.randint(7, 20))
                    )
                    continue

                # Accept the chosen offer => create service order
                # Mark other offers rejected
                ServiceOffer.objects.filter(service_request=sr).exclude(pk=accepted_offer.pk).update(status="Rejected")
                ServiceOffer.objects.filter(pk=accepted_offer.pk).update(status="Accepted")

                log_event(
                    provider=accepted_offer.provider,
                    actor_type="GROUP3_SYSTEM",
                    actor_user=None,
                    event_type="SERVICE_OFFER_ACCEPTED",
                    entity_type="ServiceOffer",
                    entity_id=accepted_offer.id,
                    message=f"Offer {accepted_offer.id} accepted for service request {sr.id}.",
                    metadata={"serviceRequestId": sr.id, "offerId": accepted_offer.id},
                    at=(accepted_offer.submitted_at or sr_created) + timedelta(days=random.randint(1, 5))
                )

                order_count += 1
                order_title = f"{sr.role} – {sr.technology} ({sr.type})"

                order = ServiceOrder.objects.create(
                    service_offer=accepted_offer,
                    service_request=sr,
                    provider=accepted_offer.provider,
                    specialist=accepted_offer.specialist,
                    title=order_title,
                    start_date=sr.start_date,
                    end_date=sr.end_date,
                    location=sr.performance_location,
                    man_days=sr.total_man_days,
                    total_cost=accepted_offer.total_cost,
                    status="Active",
                )

                # Make created_at realistic
                order_created = rand_dt(sr_created.date(), min(sr_created.date() + timedelta(days=15), TODAY))
                ServiceOrder.objects.filter(pk=order.pk).update(created_at=order_created)

                # SR closes once order exists
                ServiceRequest.objects.filter(pk=sr.pk).update(status="Closed")

                log_event(
                    provider=accepted_offer.provider,
                    actor_type="SYSTEM",
                    actor_user=None,
                    event_type="SERVICE_ORDER_CREATED",
                    entity_type="ServiceOrder",
                    entity_id=order.id,
                    message=f"Service order {order.id} created from accepted offer {accepted_offer.id}.",
                    metadata={"serviceOrderId": order.id, "serviceRequestId": sr.id, "contractId": sr.linked_contract_id},
                    at=order_created
                )

                # Invoice-like events (no model field exists) => store in ActivityLog metadata
                log_event(
                    provider=accepted_offer.provider,
                    actor_type="SYSTEM",
                    actor_user=None,
                    event_type="INVOICE_CREATED",
                    entity_type="ServiceOrder",
                    entity_id=order.id,
                    message=f"Invoice created for service order {order.id}.",
                    metadata={"serviceOrderId": order.id, "invoiceStatus": "Invoiced", "amount": float(order.total_cost), "currency": "EUR"},
                    at=order_created + timedelta(days=random.randint(10, 40))
                )

                if random.random() < 0.65:
                    log_event(
                        provider=accepted_offer.provider,
                        actor_type="SYSTEM",
                        actor_user=None,
                        event_type="INVOICE_PAID",
                        entity_type="ServiceOrder",
                        entity_id=order.id,
                        message=f"Invoice paid for service order {order.id}.",
                        metadata={"serviceOrderId": order.id, "invoiceStatus": "Paid", "amount": float(order.total_cost), "currency": "EUR"},
                        at=order_created + timedelta(days=random.randint(35, 85))
                    )

                # Some orders completed in the past
                if sr.end_date and sr.end_date < TODAY and random.random() < 0.78:
                    ServiceOrder.objects.filter(pk=order.pk).update(status="Completed")
                    log_event(
                        provider=accepted_offer.provider,
                        actor_type="SYSTEM",
                        actor_user=None,
                        event_type="SERVICE_ORDER_COMPLETED",
                        entity_type="ServiceOrder",
                        entity_id=order.id,
                        message=f"Service order {order.id} completed.",
                        metadata={"serviceOrderId": order.id, "status": "Completed"},
                        at=rand_dt(sr.end_date, min(sr.end_date + timedelta(days=10), TODAY))
                    )
                    specialist_stats[accepted_offer.specialist_id]["completed"] += 1
                else:
                    specialist_stats[accepted_offer.specialist_id]["active"] += 1

                # Some change requests on long orders
                if sr.total_man_days >= 20 and random.random() < 0.25:
                    change_req_count += 1
                    cr_type = random.choice(["Extension", "Substitution"])
                    provider_user = next(u for u in users_by_provider[accepted_offer.provider_id] if u.role in ["Supplier Representative", "Provider Admin"])
                    decided_by = next(u for u in users_by_provider[accepted_offer.provider_id] if u.role == "Contract Coordinator")

                    cr = ServiceOrderChangeRequest.objects.create(
                        service_order=order,
                        provider=accepted_offer.provider,
                        type=cr_type,
                        status=random.choice(["Approved", "Declined"]),
                        created_by_system=False,
                        created_by_user=provider_user,
                        decided_by_user=decided_by,
                        # --- CHANGED ---
                        reason="Capacity/project changes require an adjustment of the assignment.",
                        # --- CHANGED ---
                        provider_response_note="Reviewed and decided in accordance with the framework conditions.",
                        new_end_date=(order.end_date + timedelta(days=random.choice([10, 20, 30]))) if cr_type == "Extension" else None,
                        additional_man_days=(random.choice([5, 10, 15])) if cr_type == "Extension" else None,
                        new_total_cost=(order.total_cost + money(random.randint(2500, 9000))) if cr_type == "Extension" else None,
                        old_specialist=order.specialist if cr_type == "Substitution" else None,
                        new_specialist=(random.choice(specialists_by_provider[accepted_offer.provider_id]) if cr_type == "Substitution" else None),
                        decided_at=rand_dt(order_created.date() + timedelta(days=10), min(order_created.date() + timedelta(days=60), TODAY)),
                    )
                    ServiceOrderChangeRequest.objects.filter(pk=cr.pk).update(created_at=rand_dt(order_created.date(), min(order_created.date() + timedelta(days=10), TODAY)))

                    log_event(
                        provider=accepted_offer.provider,
                        actor_type="USER",
                        actor_user=provider_user,
                        event_type="SERVICE_ORDER_CHANGE_REQUEST_CREATED",
                        entity_type="ServiceOrderChangeRequest",
                        entity_id=cr.id,
                        message=f"Change request {cr.id} ({cr.type}) created for order {order.id}.",
                        metadata={"serviceOrderId": order.id, "changeRequestId": cr.id, "type": cr.type},
                        at=rand_dt(order_created.date(), min(order_created.date() + timedelta(days=10), TODAY))
                    )
                    log_event(
                        provider=accepted_offer.provider,
                        actor_type="USER",
                        actor_user=decided_by,
                        event_type="SERVICE_ORDER_CHANGE_REQUEST_DECIDED",
                        entity_type="ServiceOrderChangeRequest",
                        entity_id=cr.id,
                        message=f"Change request {cr.id} decided: {cr.status}.",
                        metadata={"serviceOrderId": order.id, "changeRequestId": cr.id, "status": cr.status},
                        at=cr.decided_at
                    )

        # Update specialist counters
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
        self.stdout.write("========== DEMO DATA SUMMARY ==========")
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
        for exp, (lo, hi) in EXP_RATE_BANDS.items():
            self.stdout.write(f" - {exp}: {lo}–{hi}")

        self.stdout.write("=======================================\n")
