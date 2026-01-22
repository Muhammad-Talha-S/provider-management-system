# backend/<your_app>/management/commands/seed_users_providers_only.py
from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Dict, List

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from providers.models import Provider
from accounts.models import User

PASSWORD = "login123"
TODAY = date(2026, 1, 15)

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
RATE_BY_EXP = {  # EUR/day
    "Junior": 520,
    "Mid": 690,
    "Senior": 890,
    "Expert": 1080,
}


def aware(y: int, m: int, d: int, hh: int = 10, mm: int = 0) -> datetime:
    return timezone.make_aware(datetime(y, m, d, hh, mm))


def money(x: int | float | Decimal) -> Decimal:
    return Decimal(str(round(float(x), 2)))


def slug_email(full_name: str, domain: str) -> str:
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


class Command(BaseCommand):
    help = "Seed ONLY Providers + Users (roles + specialists). Deterministic IDs/names/emails/dates."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("⚠️  Wiping existing Users + Providers..."))
        self._wipe()

        self.stdout.write(self.style.WARNING("🌱 Seeding Providers..."))
        providers = self._seed_providers()

        self.stdout.write(self.style.WARNING("👤 Seeding Users + Specialists (deterministic)..."))
        users_by_provider, specialists_by_provider = self._seed_users(providers)

        self.stdout.write(self.style.SUCCESS("✅ Providers + Users seeding completed.\n"))
        self._print_summary(providers, users_by_provider, specialists_by_provider)

    def _wipe(self):
        # wipe users first (FK -> Provider with PROTECT)
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
                sms_notifications=False,
                preferred_language=p["preferred_language"],
                status="Active",
                created_at=p["created_at"],
            )
            out[provider.id] = provider
        return out

    def _seed_users(self, providers: Dict[str, Provider]):
        users_by_provider: Dict[str, List[User]] = {}
        specialists_by_provider: Dict[str, List[User]] = {}

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

        extra_skill_seq = [
            ["AWS", "Terraform"],
            ["Azure", "Kubernetes"],
            ["React", "TypeScript"],
            ["SAP S/4HANA"],
            ["Databricks", "Snowflake"],
        ]

        for pid, provider in providers.items():
            domain = DOMAIN_BY_PROVIDER[pid]

            # --- Role users (3 per provider) ---
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

            users_by_provider[pid] = role_users

            # --- Specialists ---
            specialists: List[User] = []
            for idx, full in enumerate(specialist_names[pid], start=1):
                sid = f"SP{pid[-1]}{idx:03d}"
                exp = EXP_SEQ[(idx - 1) % len(EXP_SEQ)]
                tech = TECH_BY_EXP[exp]
                grade = GRADE_BY_EXP[exp]
                rate = RATE_BY_EXP[exp]

                role_title, base_skills = SPECIALIST_ROLE_POOL[(idx - 1) % len(SPECIALIST_ROLE_POOL)]
                extras = extra_skill_seq[(idx - 1) % len(extra_skill_seq)]
                skills = sorted(list(dict.fromkeys(base_skills + extras)))

                User.objects.create_user(
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
                specialists.append(
                    User.objects.get(pk=sid)
                )

            expected = SPECIALISTS_COUNT[pid]
            if len(specialists) != expected:
                raise RuntimeError(f"{pid} specialists mismatch: expected={expected}, got={len(specialists)}")

            specialists_by_provider[pid] = specialists

        return users_by_provider, specialists_by_provider

    def _print_summary(self, providers, users_by_provider, specialists_by_provider):
        self.stdout.write("========== USERS + PROVIDERS SEED SUMMARY ==========")
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

        self.stdout.write("\nRate ranges (EUR/day):")
        self.stdout.write(" - Junior: 520")
        self.stdout.write(" - Mid: 690")
        self.stdout.write(" - Senior: 890")
        self.stdout.write(" - Expert: 1080")
        self.stdout.write("=======================================\n")
