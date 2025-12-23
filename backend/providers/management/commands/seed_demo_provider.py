from __future__ import annotations

from django.core.management.base import BaseCommand
from django.utils import timezone

from providers.models import Provider, Specialist
from accounts.models import ProviderUser, RoleDefinition, UserRoleAssignment, RoleRatePolicy


class Command(BaseCommand):
    help = "Seed one provider + demo users + specialist + roles + assignments + rate policies."

    def handle(self, *args, **options):
        # Provider
        provider, _ = Provider.objects.get_or_create(
            name="Demo Provider GmbH",
            defaults={"legal_name": "Demo Provider GmbH", "country": "DE", "address": "Frankfurt am Main"},
        )

        # Role Definitions
        role_specs = [
            ("Provider Admin", "Provider Management", "Business"),
            ("Supplier Representative", "Service Delivery", "Business"),
            ("Contract Coordinator", "Contracts", "Business"),
            ("Specialist", "Delivery", "Technology"),
        ]
        role_defs = {}
        for name, domain, group in role_specs:
            rd, _ = RoleDefinition.objects.get_or_create(name=name, domain=domain, group_name=group)
            role_defs[name] = rd

        # Users (password: Passw0rd!123)
        def ensure_user(email: str, full_name: str) -> ProviderUser:
            user, created = ProviderUser.objects.get_or_create(
                email=email,
                defaults={"full_name": full_name, "provider": provider, "is_active": True},
            )
            if created or not user.has_usable_password():
                user.set_password("Passw0rd!123")
                user.save(update_fields=["password"])
            if user.provider_id != provider.id:
                user.provider = provider
                user.save(update_fields=["provider"])
            return user

        alice = ensure_user("alice.admin@demo-provider.test", "Alice Admin")
        bob = ensure_user("bob.rep@demo-provider.test", "Bob SupplierRep")
        charlie = ensure_user("charlie.specialist@demo-provider.test", "Charlie Specialist")

        # Specialist profile for Charlie
        specialist, _ = Specialist.objects.get_or_create(
            provider=provider,
            full_name="Charlie Specialist",
            defaults={"material_number": "MAT-1001", "performance_grade": 4.50, "avg_daily_rate_eur": 600.00},
        )

        # Assign roles (RBAC)
        def ensure_assignment(user: ProviderUser, role_name: str, exp=None, tech=None):
            rd = role_defs[role_name]
            now = timezone.now()
            exists = UserRoleAssignment.objects.filter(
                user=user,
                role_definition=rd,
                status=UserRoleAssignment.Status.ACTIVE,
                valid_from__lte=now,
            ).filter(
                # valid_to is null or in future
                UserRoleAssignment._meta.model.objects.filter().query.where  # not evaluated; just to silence editors
            )

        # Simpler + correct: only create if not currently active
        def ensure_active_role(user: ProviderUser, role_name: str, exp=None, tech=None):
            if user.has_active_role(role_name):
                return
            UserRoleAssignment.objects.create(
                user=user,
                role_definition=role_defs[role_name],
                experience_level=exp,
                technology_level=tech,
                status=UserRoleAssignment.Status.ACTIVE,
                valid_from=timezone.now(),
            )

        ensure_active_role(alice, "Provider Admin")
        ensure_active_role(
            bob,
            "Supplier Representative",
            exp=UserRoleAssignment.ExperienceLevel.JUNIOR,
            tech=UserRoleAssignment.TechnologyLevel.COMMON,
        )
        ensure_active_role(
            charlie,
            "Specialist",
            exp=UserRoleAssignment.ExperienceLevel.JUNIOR,
            tech=UserRoleAssignment.TechnologyLevel.COMMON,
        )

        # Rate policies (example rows)
        # You can extend this to your full matrix later.
        RoleRatePolicy.objects.get_or_create(
            role_definition=role_defs["Supplier Representative"],
            experience_level=UserRoleAssignment.ExperienceLevel.JUNIOR,
            technology_level=UserRoleAssignment.TechnologyLevel.COMMON,
            defaults={"max_daily_rate_eur": 700.00},
        )

        # Print results
        self.stdout.write(self.style.SUCCESS("Seed completed"))
        self.stdout.write(f"Provider: {provider.name} ({provider.id})")
        self.stdout.write("Users (password: Passw0rd!123):")
        self.stdout.write(f" - {alice.email} roles={sorted(alice.active_role_names())}")
        self.stdout.write(f" - {bob.email} roles={sorted(bob.active_role_names())}")
        self.stdout.write(f" - {charlie.email} roles={sorted(charlie.active_role_names())}")
        self.stdout.write(f"Specialist: {specialist.full_name} material={specialist.material_number}")

        # RBAC revoke test (your demotion scenario)
        self.stdout.write("\nRBAC demotion test for Bob:")
        self.stdout.write(f"Before demotion: {sorted(bob.active_role_names())}")

        rep_rd = role_defs["Supplier Representative"]
        for a in UserRoleAssignment.objects.filter(
            user=bob, role_definition=rep_rd, status=UserRoleAssignment.Status.ACTIVE
        ):
            a.revoke()

        bob.refresh_from_db()
        self.stdout.write(f"After demotion:  {sorted(bob.active_role_names())}")
        self.stdout.write(self.style.SUCCESS("Demotion revokes access immediately ✅"))
