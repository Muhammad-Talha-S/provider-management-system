from __future__ import annotations

import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from providers.models import Provider, Specialist, SpecialistRoleCapability
from accounts.models import ProviderUser, RoleDefinition, UserRoleAssignment, RoleRatePolicy
from procurement.models import (
    Contract, ContractDomain, ContractRole, ContractRequestTypeRule, ContractVersion,
    ServiceRequest, ServiceRequestRequirement, ServiceRequestLanguage,
    ServiceOffer, ServiceOfferMatchDetail, ServiceOrder, ServiceOrderChangeRequest,
    ActivityLog,
)

# -----------------------------
# Helpers
# -----------------------------
def d(x: str) -> Decimal:
    return Decimal(x)

USER_ROLE_PROVIDER_ADMIN = ("Provider Admin", "Provider Management", "Business")
USER_ROLE_SUPPLIER_REP = ("Supplier Representative", "Service Delivery", "Business")
USER_ROLE_CONTRACT_COORD = ("Contract Coordinator", "Contracts", "Business")
USER_ROLE_SPECIALIST = ("Specialist", "Delivery", "Technology")


class Command(BaseCommand):
    help = "Seeds realistic multi-provider dataset: 5 providers, users, specialists, one active contract, 2 published service requests."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Seeding realistic dataset...")

        # ---------------------------------
        # 0) OPTIONAL: wipe existing data (safe order)
        # ---------------------------------
        # If your DB is clean already, this won't hurt; it just ensures consistency.
        ActivityLog.objects.all().delete()
        ServiceOrderChangeRequest.objects.all().delete()
        ServiceOrder.objects.all().delete()
        ServiceOfferMatchDetail.objects.all().delete()
        ServiceOffer.objects.all().delete()
        ServiceRequestLanguage.objects.all().delete()
        ServiceRequestRequirement.objects.all().delete()
        ServiceRequest.objects.all().delete()
        ContractVersion.objects.all().delete()
        ContractRequestTypeRule.objects.all().delete()
        ContractRole.objects.all().delete()
        ContractDomain.objects.all().delete()
        Contract.objects.all().delete()

        SpecialistRoleCapability.objects.all().delete()
        Specialist.objects.all().delete()

        UserRoleAssignment.objects.all().delete()
        ProviderUser.objects.all().delete()

        RoleRatePolicy.objects.all().delete()
        RoleDefinition.objects.all().delete()

        Provider.objects.all().delete()

        # ---------------------------------
        # 1) Create RoleDefinitions (user roles + service roles)
        # ---------------------------------
        def create_role(name: str, domain: str, group_name: str) -> RoleDefinition:
            return RoleDefinition.objects.create(name=name, domain=domain, group_name=group_name)

        # User roles (RBAC)
        rd_provider_admin = create_role(*USER_ROLE_PROVIDER_ADMIN)
        rd_supplier_rep = create_role(*USER_ROLE_SUPPLIER_REP)
        rd_contract_coord = create_role(*USER_ROLE_CONTRACT_COORD)
        rd_user_specialist = create_role(*USER_ROLE_SPECIALIST)

        # Service roles (requested roles under contract)
        rd_backend_dev = create_role("Backend Developer", "Consulting and Development", "Technology")
        rd_data_eng = create_role("Data Engineer", "Data & Analytics", "Technology")

        # ---------------------------------
        # 2) Rate policies (for service roles)
        # ---------------------------------
        # You can expand this matrix later; for now we add realistic caps.
        exp_levels = [
            UserRoleAssignment.ExperienceLevel.JUNIOR,
            UserRoleAssignment.ExperienceLevel.INTERMEDIATE,
            UserRoleAssignment.ExperienceLevel.SENIOR,
        ]
        tech_levels = [
            UserRoleAssignment.TechnologyLevel.COMMON,
            UserRoleAssignment.TechnologyLevel.UNCOMMON,
            UserRoleAssignment.TechnologyLevel.RARE,
        ]

        # Caps: Backend Dev
        backend_caps = {
            ("JUNIOR", "COMMON"): d("650"),
            ("JUNIOR", "UNCOMMON"): d("700"),
            ("JUNIOR", "RARE"): d("750"),
            ("INTERMEDIATE", "COMMON"): d("750"),
            ("INTERMEDIATE", "UNCOMMON"): d("850"),
            ("INTERMEDIATE", "RARE"): d("950"),
            ("SENIOR", "COMMON"): d("900"),
            ("SENIOR", "UNCOMMON"): d("1050"),
            ("SENIOR", "RARE"): d("1200"),
        }
        # Caps: Data Engineer
        data_caps = {
            ("JUNIOR", "COMMON"): d("700"),
            ("JUNIOR", "UNCOMMON"): d("800"),
            ("JUNIOR", "RARE"): d("900"),
            ("INTERMEDIATE", "COMMON"): d("850"),
            ("INTERMEDIATE", "UNCOMMON"): d("1000"),
            ("INTERMEDIATE", "RARE"): d("1150"),
            ("SENIOR", "COMMON"): d("1050"),
            ("SENIOR", "UNCOMMON"): d("1200"),
            ("SENIOR", "RARE"): d("1400"),
        }

        def seed_caps(role_def: RoleDefinition, caps: dict[tuple[str, str], Decimal]):
            for exp in exp_levels:
                for tech in tech_levels:
                    RoleRatePolicy.objects.create(
                        role_definition=role_def,
                        experience_level=exp,
                        technology_level=tech,
                        max_daily_rate_eur=caps[(exp, tech)],
                    )

        seed_caps(rd_backend_dev, backend_caps)
        seed_caps(rd_data_eng, data_caps)

        # ---------------------------------
        # 3) Create Providers + Users + Specialists
        # ---------------------------------
        providers_data = [
            ("Nordlicht Solutions GmbH", "Berlin"),
            ("RheinTech Consulting GmbH", "Köln"),
            ("Mainhattan Digital GmbH", "Frankfurt am Main"),
            ("AlpenByte Systems GmbH", "München"),
            ("Hanseatic Cloud Works GmbH", "Hamburg"),
        ]

        # deterministic-ish email domains
        provider_domains = ["nordlicht.dev", "rheintec.de", "mainhattan.io", "alpenbyte.de", "hansecloud.io"]

        first_names = ["Anna", "Lukas", "Sofia", "Jonas", "Mila", "Noah", "Lea", "Elias", "Nina", "Felix"]
        last_names = ["Schmidt", "Weber", "Fischer", "Meyer", "Wagner", "Becker", "Hoffmann", "Koch", "Richter", "Klein"]

        def make_person(i: int) -> str:
            return f"{random.choice(first_names)} {random.choice(last_names)}"

        def emailify(name: str, domain: str) -> str:
            return name.lower().replace(" ", ".") + "@" + domain

        created_providers: list[Provider] = []

        for idx, (pname, city) in enumerate(providers_data):
            prov = Provider.objects.create(
                name=pname,
                legal_name=pname,
                country="DE",
                address=f"{city}, Germany",
            )
            created_providers.append(prov)

            domain = provider_domains[idx]

            # Provider Admin
            admin_name = make_person(idx)
            admin_user = ProviderUser.objects.create_user(
                email=emailify(admin_name, domain),
                password="Passw0rd!123",
                full_name=admin_name,
                provider=prov,
                is_active=True,
            )
            UserRoleAssignment.objects.create(
                user=admin_user,
                role_definition=rd_provider_admin,
                status=UserRoleAssignment.Status.ACTIVE,
                valid_from=timezone.now(),
            )

            # Supplier Representative
            rep_name = make_person(idx + 10)
            rep_user = ProviderUser.objects.create_user(
                email=emailify(rep_name, domain),
                password="Passw0rd!123",
                full_name=rep_name,
                provider=prov,
                is_active=True,
            )
            UserRoleAssignment.objects.create(
                user=rep_user,
                role_definition=rd_supplier_rep,
                status=UserRoleAssignment.Status.ACTIVE,
                valid_from=timezone.now(),
                experience_level=UserRoleAssignment.ExperienceLevel.INTERMEDIATE,
                technology_level=UserRoleAssignment.TechnologyLevel.COMMON,
            )

            # Contract Coordinator
            coord_name = make_person(idx + 20)
            coord_user = ProviderUser.objects.create_user(
                email=emailify(coord_name, domain),
                password="Passw0rd!123",
                full_name=coord_name,
                provider=prov,
                is_active=True,
            )
            UserRoleAssignment.objects.create(
                user=coord_user,
                role_definition=rd_contract_coord,
                status=UserRoleAssignment.Status.ACTIVE,
                valid_from=timezone.now(),
            )

            # Specialists (6–10)
            num_specs = random.randint(6, 10)
            for s in range(num_specs):
                spec_name = make_person(idx * 100 + s)
                spec = Specialist.objects.create(
                    provider=prov,
                    full_name=spec_name,
                    material_number=f"{idx+1:02d}-MAT-{1000+s}",
                    performance_grade=d(str(round(random.uniform(3.5, 5.0), 2))),
                    avg_daily_rate_eur=d(str(random.choice([550, 600, 650, 700, 800, 900]))),
                    is_active=True,
                )

                # Give each specialist a capability in either Backend or Data role (or both sometimes)
                possible_roles = [rd_backend_dev, rd_data_eng]
                chosen = random.sample(possible_roles, k=random.choice([1, 1, 2]))

                for role_def in chosen:
                    SpecialistRoleCapability.objects.create(
                        specialist=spec,
                        role_definition=role_def,
                        experience_level=random.choice(exp_levels),
                        technology_level=random.choice(tech_levels),
                    )

        # ---------------------------------
        # 4) Create 1 Active Contract
        # ---------------------------------
        contract = Contract.objects.create(
            title="FraUAS IT Professional Services Framework 2026",
            status="ACTIVE",
            publishing_date=timezone.now().date(),
            offer_deadline_at=timezone.now() + timezone.timedelta(days=21),
            scope_of_work="Provision of external IT specialists for software engineering and data projects.",
            terms_and_conditions="Standard framework terms for delivery, compliance, and invoicing.",
            negotiation_history={"note": "Seeded contract for demo/testing"},
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timezone.timedelta(days=365)).date(),
            functional_weight_pct=60,
            commercial_weight_pct=40,
        )

        # Domains
        for dn in ["Consulting and Development", "Data & Analytics"]:
            ContractDomain.objects.create(contract=contract, domain_name=dn)

        # Roles allowed under contract
        for rd in [rd_backend_dev, rd_data_eng]:
            ContractRole.objects.create(contract=contract, role_definition=rd)

        # Request type rules
        ContractRequestTypeRule.objects.create(contract=contract, request_type="SINGLE", offer_deadline_days=10, cycles=1)
        ContractRequestTypeRule.objects.create(contract=contract, request_type="TEAM", offer_deadline_days=14, cycles=2)

        # Version record
        ContractVersion.objects.create(contract=contract, version_no=1, status="SIGNED", document_url="https://example.com/contract-v1.pdf")

        # ---------------------------------
        # 5) Create 2 Published Service Requests linked to contract
        # ---------------------------------
        sr1 = ServiceRequest.objects.create(
            title="Senior Backend Developer (Django) — Q1 Delivery Support",
            request_type="SINGLE",
            contract=contract,
            requested_by_external_id="PM-1024",
            status="PUBLISHED",
            start_date=(timezone.now() + timezone.timedelta(days=14)).date(),
            end_date=(timezone.now() + timezone.timedelta(days=90)).date(),
            domain_name="Consulting and Development",
            role_definition=rd_backend_dev,
            technology="Python / Django / PostgreSQL",
            experience_level=UserRoleAssignment.ExperienceLevel.SENIOR,
            sum_man_days=60,
            onsite_days=8,
            performance_location="NEARSHORE",
            task_description="Support backend delivery, API development, code reviews, and CI/CD improvements.",
        )

        sr2 = ServiceRequest.objects.create(
            title="Data Engineer (ETL + Analytics) — Platform Reporting Enablement",
            request_type="SINGLE",
            contract=contract,
            requested_by_external_id="PM-2048",
            status="PUBLISHED",
            start_date=(timezone.now() + timezone.timedelta(days=21)).date(),
            end_date=(timezone.now() + timezone.timedelta(days=120)).date(),
            domain_name="Data & Analytics",
            role_definition=rd_data_eng,
            technology="Python / SQL / Airflow / dbt",
            experience_level=UserRoleAssignment.ExperienceLevel.INTERMEDIATE,
            sum_man_days=70,
            onsite_days=10,
            performance_location="OFFSHORE",
            task_description="Build ETL pipelines, data models for KPIs, and automate data quality checks.",
        )

        # Requirements + languages
        def add_reqs(sr: ServiceRequest, must: list[tuple[str, int | None]], nice: list[tuple[str, int | None]]):
            for skill, w in must:
                ServiceRequestRequirement.objects.create(service_request=sr, type="MUST_HAVE", skill_name=skill, weight_pct=w)
            for skill, w in nice:
                ServiceRequestRequirement.objects.create(service_request=sr, type="NICE_TO_HAVE", skill_name=skill, weight_pct=w)

        add_reqs(
            sr1,
            must=[("Django REST Framework", 40), ("PostgreSQL", 30), ("CI/CD (GitHub Actions)", 30)],
            nice=[("Docker", 20), ("Redis", 10), ("AWS", 10)],
        )
        ServiceRequestLanguage.objects.create(service_request=sr1, language="English", skill_level="C1")
        ServiceRequestLanguage.objects.create(service_request=sr1, language="German", skill_level="B2")

        add_reqs(
            sr2,
            must=[("SQL (advanced)", 40), ("Python ETL", 35), ("Data Modeling", 25)],
            nice=[("Airflow", 15), ("dbt", 15), ("Power BI", 10)],
        )
        ServiceRequestLanguage.objects.create(service_request=sr2, language="English", skill_level="C1")

        self.stdout.write(self.style.SUCCESS("✅ Seeded realistic providers/users/specialists + contract + 2 published service requests"))
        self.stdout.write(self.style.SUCCESS("Login password for all users: Passw0rd!123"))
