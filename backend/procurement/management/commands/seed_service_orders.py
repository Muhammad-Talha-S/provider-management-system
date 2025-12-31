from __future__ import annotations

import random
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import ProviderUser
from providers.models import Provider
from procurement.models import ServiceRequest, ServiceOffer, ServiceOrder, ActivityLog


class Command(BaseCommand):
    help = "Seeds a few ServiceOrders for testing (creates ACCEPTED offers + ACTIVE service orders)."

    @transaction.atomic
    def handle(self, *args, **options):
        srs = list(ServiceRequest.objects.filter(status="PUBLISHED").order_by("created_at")[:2])
        if not srs:
            self.stdout.write(self.style.ERROR("No PUBLISHED ServiceRequests found. Run seed_realistic_data first."))
            return

        providers = list(Provider.objects.all()[:5])
        if not providers:
            self.stdout.write(self.style.ERROR("No Providers found. Run seed_realistic_data first."))
            return

        created = 0

        for prov in providers[:4]:
            # Get supplier rep user
            users = list(ProviderUser.objects.filter(provider=prov, is_active=True))
            rep = next((u for u in users if u.has_system_role("Supplier Representative")), None)
            if not rep:
                continue

            # Pick an SR
            sr = random.choice(srs)

            # Pick a specialist user who can satisfy role_definition (JOB)
            job_def = sr.role_definition
            if not job_def:
                continue

            candidates = [u for u in users if u.has_system_role("Specialist")]
            # must have active job assignment for sr.role_definition
            from accounts.models import UserRoleAssignment
            candidates = [
                u for u in candidates
                if UserRoleAssignment.objects.filter(
                    user=u, role_definition=job_def, status=UserRoleAssignment.Status.ACTIVE
                ).exists()
            ]
            if not candidates:
                continue

            specialist_user = random.choice(candidates)

            daily_rate = Decimal("900.00")
            travel = Decimal("120.00")
            total_cost = (daily_rate * Decimal(sr.sum_man_days or 0)) + (travel * Decimal(sr.onsite_days or 0))

            offer = ServiceOffer.objects.create(
                service_request=sr,
                provider=prov,
                submitted_by_user=rep,
                specialist_user=specialist_user,
                daily_rate_eur=daily_rate,
                travel_cost_per_onsite_day_eur=travel,
                total_cost_eur=total_cost,
                contractual_relationship="EMPLOYEE",
                status="ACCEPTED",  # seed-only
                match_score=0,
            )

            so = ServiceOrder.objects.create(
                title=sr.title,
                status="ACTIVE",
                service_request=sr,
                accepted_offer=offer,
                provider=prov,
                supplier_representative_user=rep,
                specialist_user=specialist_user,
                role_definition=sr.role_definition,
                start_date=sr.start_date,
                end_date=sr.end_date,
                location=sr.performance_location,
                man_days=sr.sum_man_days,
            )

            ActivityLog.objects.create(
                provider=prov,
                actor_user=None,
                action="SERVICE_ORDER_SEEDED",
                entity_type="service_order",
                entity_id=so.id,
                details={
                    "service_request_id": str(sr.id),
                    "accepted_offer_id": str(offer.id),
                    "supplier_rep_email": rep.email,
                    "specialist_user_email": specialist_user.email,
                },
            )

            created += 1

        self.stdout.write(self.style.SUCCESS(f"✅ Seeded {created} ServiceOrders (with ACCEPTED offers)."))
