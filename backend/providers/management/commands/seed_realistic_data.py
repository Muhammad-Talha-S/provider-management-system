from __future__ import annotations

import random
import uuid
from decimal import Decimal
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from providers.models import Provider
from accounts.models import ProviderUser, RoleDefinition, UserRoleAssignment, SpecialistProfile, RoleRatePolicy
from procurement.models import (
    Contract,
    ServiceRequest,
    ServiceRequestRequirement,
    ServiceRequestLanguage,
    ServiceOffer,
    ServiceOfferMatchDetail,
)

SYSTEM_ROLES = [
    "Specialist",
    "Provider Admin",
    "Supplier Representative",
    "Contract Coordinator",
]

JOB_ROLES = [
    "Full Stack Developer",
    "Data Engineer",
    "Backend Django Developer",
    "Frontend Developer",
]

FIRST_NAMES = [
    "Ayesha", "Hassan", "Fatima", "Ali", "Zara", "Usman", "Noor", "Hamza", "Iqra", "Bilal",
    "Sara", "Omar", "Hira", "Danish", "Amna", "Saad", "Mahnoor", "Shayan", "Maryam", "Taimoor",
]
LAST_NAMES = [
    "Khan", "Malik", "Ahmed", "Raza", "Javed", "Siddiqui", "Butt", "Chaudhry", "Shah", "Farooq",
    "Qureshi", "Nawaz", "Hussain", "Iqbal", "Yousaf", "Rehman", "Saleem", "Zahid", "Aziz", "Tariq",
]

PROVIDER_NAMES = [
    "NordPeak Solutions GmbH",
    "RheinTech Consulting AG",
    "CloudCrafters Europe GmbH",
    "DataForge Systems GmbH",
    "Vertex Digital Partners GmbH",
]


def slugify_email(name: str) -> str:
    base = name.lower().replace(" ", ".")
    base = "".join(ch for ch in base if ch.isalnum() or ch == ".")
    return base


def make_employee_name() -> str:
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def ensure_role(role_type: str, name: str) -> RoleDefinition:
    obj, _ = RoleDefinition.objects.get_or_create(
        role_type=role_type,
        name=name,
        domain=None,
        group_name=None,
        defaults={"validation_rules": None},
    )
    return obj


def assign_role(user: ProviderUser, role_def: RoleDefinition, exp=None, tech=None):
    # Prevent duplicates
    existing = UserRoleAssignment.objects.filter(
        user=user,
        role_definition=role_def,
        status=UserRoleAssignment.Status.ACTIVE,
    ).first()
    if existing:
        return existing

    return UserRoleAssignment.objects.create(
        user=user,
        role_definition=role_def,
        experience_level=exp,
        technology_level=tech,
        status=UserRoleAssignment.Status.ACTIVE,
        valid_from=timezone.now(),
    )


def ensure_rate_policies(job_role_defs: list[RoleDefinition]):
    """
    Create a reasonable max rate matrix for each JOB role.
    """
    matrix = [
        (UserRoleAssignment.ExperienceLevel.JUNIOR, UserRoleAssignment.TechnologyLevel.COMMON, Decimal("650")),
        (UserRoleAssignment.ExperienceLevel.INTERMEDIATE, UserRoleAssignment.TechnologyLevel.COMMON, Decimal("850")),
        (UserRoleAssignment.ExperienceLevel.SENIOR, UserRoleAssignment.TechnologyLevel.COMMON, Decimal("1100")),
        (UserRoleAssignment.ExperienceLevel.JUNIOR, UserRoleAssignment.TechnologyLevel.UNCOMMON, Decimal("750")),
        (UserRoleAssignment.ExperienceLevel.INTERMEDIATE, UserRoleAssignment.TechnologyLevel.UNCOMMON, Decimal("950")),
        (UserRoleAssignment.ExperienceLevel.SENIOR, UserRoleAssignment.TechnologyLevel.UNCOMMON, Decimal("1250")),
        (UserRoleAssignment.ExperienceLevel.JUNIOR, UserRoleAssignment.TechnologyLevel.RARE, Decimal("850")),
        (UserRoleAssignment.ExperienceLevel.INTERMEDIATE, UserRoleAssignment.TechnologyLevel.RARE, Decimal("1100")),
        (UserRoleAssignment.ExperienceLevel.SENIOR, UserRoleAssignment.TechnologyLevel.RARE, Decimal("1400")),
    ]

    for rd in job_role_defs:
        for exp, tech, max_rate in matrix:
            RoleRatePolicy.objects.get_or_create(
                role_definition=rd,
                experience_level=exp,
                technology_level=tech,
                defaults={"max_daily_rate_eur": max_rate},
            )


@transaction.atomic
class Command(BaseCommand):
    help = "Seeds realistic providers, users (employees), system roles, job roles, contract, service requests, requirements, and offers."

    def handle(self, *args, **options):
        random.seed(11)

        # --- Create roles ---
        system_role_defs = [ensure_role(RoleDefinition.RoleType.SYSTEM, r) for r in SYSTEM_ROLES]
        job_role_defs = [ensure_role(RoleDefinition.RoleType.JOB, r) for r in JOB_ROLES]
        ensure_rate_policies(job_role_defs)

        # --- Providers ---
        providers = []
        Provider.objects.all().delete()
        for name in PROVIDER_NAMES[:5]:
            providers.append(Provider.objects.create(name=name))

        # --- Users per provider ---
        ProviderUser.objects.all().delete()

        for idx, prov in enumerate(providers, start=1):
            # Create key employees
            admin_name = make_employee_name()
            rep_name = make_employee_name()
            cc_name = make_employee_name()

            admin = ProviderUser.objects.create_user(
                email=f"{slugify_email(admin_name)}@{slugify_email(prov.name.split()[0])}.com",
                password="Pass12345!",
                full_name=admin_name,
                provider=prov,
                is_active=True,
                is_staff=False,
            )
            rep = ProviderUser.objects.create_user(
                email=f"{slugify_email(rep_name)}@{slugify_email(prov.name.split()[0])}.com",
                password="Pass12345!",
                full_name=rep_name,
                provider=prov,
                is_active=True,
                is_staff=False,
            )
            cc = ProviderUser.objects.create_user(
                email=f"{slugify_email(cc_name)}@{slugify_email(prov.name.split()[0])}.com",
                password="Pass12345!",
                full_name=cc_name,
                provider=prov,
                is_active=True,
                is_staff=False,
            )

            # Everyone has base SYSTEM Specialist role
            specialist_sys = ensure_role(RoleDefinition.RoleType.SYSTEM, "Specialist")
            assign_role(admin, specialist_sys)
            assign_role(rep, specialist_sys)
            assign_role(cc, specialist_sys)

            # Additional SYSTEM roles
            assign_role(admin, ensure_role(RoleDefinition.RoleType.SYSTEM, "Provider Admin"))
            assign_role(rep, ensure_role(RoleDefinition.RoleType.SYSTEM, "Supplier Representative"))
            assign_role(cc, ensure_role(RoleDefinition.RoleType.SYSTEM, "Contract Coordinator"))

            # SpecialistProfiles for all
            SpecialistProfile.objects.get_or_create(
                user=admin,
                defaults={
                    "material_number": f"M-{idx}A-{random.randint(10000,99999)}",
                    "performance_grade": Decimal("4.50"),
                    "avg_daily_rate_eur": Decimal("1000.00"),
                },
            )
            SpecialistProfile.objects.get_or_create(
                user=rep,
                defaults={
                    "material_number": f"M-{idx}R-{random.randint(10000,99999)}",
                    "performance_grade": Decimal("4.20"),
                    "avg_daily_rate_eur": Decimal("950.00"),
                },
            )
            SpecialistProfile.objects.get_or_create(
                user=cc,
                defaults={
                    "material_number": f"M-{idx}C-{random.randint(10000,99999)}",
                    "performance_grade": Decimal("4.10"),
                    "avg_daily_rate_eur": Decimal("900.00"),
                },
            )

            # Create 6–10 normal employees (Specialists)
            employee_count = random.randint(6, 10)
            for _ in range(employee_count):
                name = make_employee_name()
                email = f"{slugify_email(name)}.{uuid.uuid4().hex[:6]}@{slugify_email(prov.name.split()[0])}.com"

                u = ProviderUser.objects.create_user(
                    email=email,
                    password="Pass12345!",
                    full_name=name,
                    provider=prov,
                    is_active=True,
                    is_staff=False,
                )
                assign_role(u, specialist_sys)

                # Assign 1–2 JOB roles with exp/tech levels
                primary_job = random.choice(job_role_defs)
                exp = random.choice(list(UserRoleAssignment.ExperienceLevel.values))
                tech = random.choice(list(UserRoleAssignment.TechnologyLevel.values))
                assign_role(u, primary_job, exp=exp, tech=tech)

                if random.random() < 0.35:
                    secondary_job = random.choice([x for x in job_role_defs if x.id != primary_job.id])
                    exp2 = random.choice(list(UserRoleAssignment.ExperienceLevel.values))
                    tech2 = random.choice(list(UserRoleAssignment.TechnologyLevel.values))
                    assign_role(u, secondary_job, exp=exp2, tech=tech2)

                SpecialistProfile.objects.get_or_create(
                    user=u,
                    defaults={
                        "material_number": f"M-{idx}-{random.randint(10000,99999)}",
                        "performance_grade": Decimal(str(round(random.uniform(3.5, 4.9), 2))),
                        "avg_daily_rate_eur": Decimal(str(random.choice([750, 850, 950, 1050, 1150]))),
                    },
                )

        # --- Contract + Service Requests ---
        Contract.objects.all().delete()
        ServiceRequest.objects.all().delete()

        contract = Contract.objects.create(
            title="FraUAS IT Services Framework 2026",
            status="ACTIVE",
            publishing_date=date.today() - timedelta(days=30),
            offer_deadline_at=timezone.now() + timedelta(days=10),
            scope_of_work="Provision of software engineering services across web and data projects.",
            terms_and_conditions="Standard T&Cs apply. NDA required. Compliance with internal security policies.",
            start_date=date.today() - timedelta(days=10),
            end_date=date.today() + timedelta(days=365),
            functional_weight_pct=60,
            commercial_weight_pct=40,
        )

        # Two PUBLISHED service requests linked to contract with JOB role defs
        job_backend = RoleDefinition.objects.get(role_type=RoleDefinition.RoleType.JOB, name="Backend Django Developer")
        job_data = RoleDefinition.objects.get(role_type=RoleDefinition.RoleType.JOB, name="Data Engineer")

        sr1 = ServiceRequest.objects.create(
            title="Backend Django Developer for API modernization",
            request_type="SINGLE",
            contract=contract,
            requested_by_external_id="PM-1201",
            status="PUBLISHED",
            start_date=date.today() + timedelta(days=14),
            end_date=date.today() + timedelta(days=120),
            domain_name="Consulting and Development",
            role_definition=job_backend,
            technology="Django, DRF, PostgreSQL",
            experience_level="INTERMEDIATE",
            sum_man_days=60,
            onsite_days=10,
            performance_location="NEARSHORE",
            task_description="Implement and stabilize backend APIs, enforce RBAC, build audit logging, optimize queries.",
        )

        sr2 = ServiceRequest.objects.create(
            title="Data Engineer for ETL + Analytics Foundation",
            request_type="SINGLE",
            contract=contract,
            requested_by_external_id="PM-1202",
            status="PUBLISHED",
            start_date=date.today() + timedelta(days=21),
            end_date=date.today() + timedelta(days=150),
            domain_name="Data Platform",
            role_definition=job_data,
            technology="Python, SQL, Airflow",
            experience_level="SENIOR",
            sum_man_days=80,
            onsite_days=15,
            performance_location="OFFSHORE",
            task_description="Build ETL pipelines, data quality checks, analytics tables, and monitoring dashboards.",
        )

        # Requirements + Languages
        def add_requirements(sr: ServiceRequest):
            must = ["Django REST Framework", "PostgreSQL query optimization", "JWT auth + RBAC"]
            nice = ["Docker", "CI/CD basics", "Sentry/Observability"]
            for skill in must[:3]:
                ServiceRequestRequirement.objects.create(
                    service_request=sr, type="MUST_HAVE", skill_name=skill, weight_pct=random.choice([25, 30, 35])
                )
            for skill in nice[:5]:
                ServiceRequestRequirement.objects.create(
                    service_request=sr, type="NICE_TO_HAVE", skill_name=skill, weight_pct=random.choice([10, 15, 20])
                )

            ServiceRequestLanguage.objects.create(service_request=sr, language="English", skill_level="B2")
            ServiceRequestLanguage.objects.create(service_request=sr, language="German", skill_level="B1")

        add_requirements(sr1)
        add_requirements(sr2)

        # --- Offers (basic) ---
        ServiceOffer.objects.all().delete()

        for prov in Provider.objects.all():
            rep = ProviderUser.objects.filter(provider=prov).all()
            rep = next((u for u in rep if u.has_system_role("Supplier Representative")), None)
            if not rep:
                continue

            # Find employees who have matching JOB role assignment
            def pick_employee_for_role(job_role_name: str):
                job_def = RoleDefinition.objects.get(role_type=RoleDefinition.RoleType.JOB, name=job_role_name)
                candidates = ProviderUser.objects.filter(provider=prov, is_active=True).all()
                candidates = [u for u in candidates if u.has_system_role("Specialist")]
                # must have active assignment for the role
                good = []
                for u in candidates:
                    if UserRoleAssignment.objects.filter(
                        user=u, role_definition=job_def, status=UserRoleAssignment.Status.ACTIVE
                    ).exists():
                        good.append(u)
                return random.choice(good) if good else None

            emp1 = pick_employee_for_role("Backend Django Developer")
            if emp1:
                daily = Decimal(str(random.choice([700, 850, 950, 1050])))
                travel = Decimal("120")
                total = (daily * Decimal(sr1.sum_man_days)) + (travel * Decimal(sr1.onsite_days))
                offer = ServiceOffer.objects.create(
                    service_request=sr1,
                    provider=prov,
                    submitted_by_user=rep,
                    specialist_user=emp1,
                    daily_rate_eur=daily,
                    travel_cost_per_onsite_day_eur=travel,
                    total_cost_eur=total,
                    contractual_relationship="EMPLOYEE",
                    status="SUBMITTED",
                    match_score=0,
                )
                ServiceOfferMatchDetail.objects.create(service_offer=offer, details={"seed": True})

            emp2 = pick_employee_for_role("Data Engineer")
            if emp2:
                daily = Decimal(str(random.choice([850, 950, 1100, 1250])))
                travel = Decimal("150")
                total = (daily * Decimal(sr2.sum_man_days)) + (travel * Decimal(sr2.onsite_days))
                offer = ServiceOffer.objects.create(
                    service_request=sr2,
                    provider=prov,
                    submitted_by_user=rep,
                    specialist_user=emp2,
                    daily_rate_eur=daily,
                    travel_cost_per_onsite_day_eur=travel,
                    total_cost_eur=total,
                    contractual_relationship="EMPLOYEE",
                    status="SUBMITTED",
                    match_score=0,
                )
                ServiceOfferMatchDetail.objects.create(service_offer=offer, details={"seed": True})

        self.stdout.write(self.style.SUCCESS("✅ Seeded providers, users, roles (SYSTEM+JOB), contract, service requests, requirements, and offers."))
        self.stdout.write(self.style.SUCCESS("Login password for seeded users: Pass12345!"))
