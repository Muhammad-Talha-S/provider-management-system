from __future__ import annotations

import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import ProviderUser
from providers.models import Provider, Specialist
from procurement.models import ServiceRequest, ServiceOffer, ServiceOrder, ActivityLog


class Command(BaseCommand):
    help = "Seeds a few ServiceOrders for testing (creates ACCEPTED offers + ACTIVE service orders)."

    @transaction.atomic
    def handle(self, *args, **options):
        # Pick published service requests
        srs = list(ServiceRequest.objects.filter(status="PUBLISHED").order_by("created_at")[:2])
        if not srs:
            self.stdout.write(self.style.ERROR("No PUBLISHED ServiceRequests found. Run seed_realistic_data first."))
            return

        # Pick providers that have supplier reps and specialists
        providers = list(Provider.objects.all()[:4])
        if not providers:
            self.stdout.write(self.style.ERROR("No Providers found. Run seed_realistic_data first."))
            return

        created = 0

        for prov in providers[:3]:  # create orders for 3 providers
            # Supplier rep user from this provider
            rep = (
                ProviderUser.objects.filter(provider=prov)
                .order_by("created_at")
                .first()
            )
            # Better: find actual supplier rep
            rep = next((u for u in ProviderUser.objects.filter(provider=prov) if u.has_active_role("Supplier Representative")), rep)
            if not rep:
                continue

            specialists = list(Specialist.objects.filter(provider=prov, is_active=True)[:10])
            if not specialists:
                continue

            # Choose one SR randomly (or both)
            sr = random.choice(srs)
            spec = random.choice(specialists)

            # Create an accepted offer (seed-only)
            daily_rate = Decimal(str(spec.avg_daily_rate_eur or 800))
            travel = Decimal("120.00")

            total_cost = (daily_rate * Decimal(sr.sum_man_days or 0)) + (travel * Decimal(sr.onsite_days or 0))

            offer = ServiceOffer.objects.create(
                service_request=sr,
                provider=prov,
                submitted_by_user=rep,
                specialist=spec,
                daily_rate_eur=daily_rate,
                travel_cost_per_onsite_day_eur=travel,
                total_cost_eur=total_cost,
                contractual_relationship="EMPLOYEE",
                status="ACCEPTED",  # seed-only
                match_score=0,
            )

            # Create a service order
            so = ServiceOrder.objects.create(
                title=sr.title,
                status="ACTIVE",
                service_request=sr,
                accepted_offer=offer,
                provider=prov,
                supplier_representative_user=rep,
                specialist=spec,
                role_definition=sr.role_definition,
                start_date=sr.start_date,
                end_date=sr.end_date,
                location=sr.performance_location,
                man_days=sr.sum_man_days,
            )

            # Activity log (system seed)
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
                    "specialist": spec.full_name,
                },
            )

            created += 1

        self.stdout.write(self.style.SUCCESS(f"✅ Seeded {created} ServiceOrders (with ACCEPTED offers)."))
        self.stdout.write(self.style.SUCCESS("Now you can test /api/service-orders/ and change-request endpoints."))
