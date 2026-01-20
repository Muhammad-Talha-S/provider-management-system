from django.core.management.base import BaseCommand
from django.utils import timezone

from contracts.models import Contract, ContractProviderStatus
from providers.models import Provider


class Command(BaseCommand):
    help = "Seed one demo contract (C003) and award it to P001 and P002 as ACTIVE."

    def handle(self, *args, **options):
        # ---- Providers ----
        p1 = Provider.objects.get(id="P001")
        p2 = Provider.objects.get(id="P002")

        # ---- Contract config (permissive, supports all SR types) ----
        config = {
            "domains": [
                "Web Development",
                "Cloud Services",
                "DevOps",
                "XR Technology",
                "Software Development",
            ],
            "roles": [
                "Full Stack Developer",
                "Backend Developer",
                "Frontend Developer",
                "DevOps Engineer",
                "UX Designer",
                "Java Developer",
            ],
            "experienceLevels": ["Junior", "Intermediate", "Senior", "Expert"],
            "technologyLevels": ["Basic", "Intermediate", "Advanced", "Expert"],
            "acceptedServiceRequestTypes": [
                {"type": "SINGLE", "isAccepted": True, "biddingDeadlineDays": 7, "offerCycles": 2},
                {"type": "MULTI", "isAccepted": True, "biddingDeadlineDays": 10, "offerCycles": 2},
                {"type": "TEAM", "isAccepted": True, "biddingDeadlineDays": 14, "offerCycles": 2},
                {"type": "WORK_CONTRACT", "isAccepted": True, "biddingDeadlineDays": 21, "offerCycles": 1},
            ],
            "pricingRules": {
                "currency": "EUR",
                # Permissive caps so offers won’t be rejected during demo
                "maxDailyRates": [
                    {"role": "*", "experienceLevel": "*", "technologyLevel": "*", "maxDailyRate": 2500}
                ],
            },
            "constraints": {"mustHaveMax": 3, "niceToHaveMax": 5},
        }

        contract, created = Contract.objects.update_or_create(
            id="C003",
            defaults={
                "title": "Demo Contract C003 (Seeded)",
                "kind": "SERVICE",
                "status": "ACTIVE",
                "publishing_date": timezone.now().date(),
                "offer_deadline_at": timezone.now(),
                "stakeholders": {
                    "procurementManager": "Seed PM",
                    "legalCounsel": "Seed Legal",
                    "contractAdministrator": "Seed Admin",
                },
                "scope_of_work": "Seeded demo contract for provider portal testing.",
                "terms_and_conditions": "Seeded T&C.",
                "weighting": {"functional": 60, "commercial": 40},
                "config": config,
                "versions_and_documents": [
                    {
                        "version": 1,
                        "versionDate": str(timezone.now().date()),
                        "status": "SIGNED",
                        "changeSummary": "Seeded version",
                        "documents": [],
                    }
                ],
                "external_snapshot": {"seed": True, "contractId": "C003"},
            },
        )

        # ---- Award to P001 & P002 ----
        ContractProviderStatus.objects.update_or_create(
            contract=contract,
            provider=p1,
            defaults={"status": "ACTIVE", "note": "Seeded award to P001"},
        )
        ContractProviderStatus.objects.update_or_create(
            contract=contract,
            provider=p2,
            defaults={"status": "ACTIVE", "note": "Seeded award to P002"},
        )

        self.stdout.write(self.style.SUCCESS("Seeded contract C003 and set provider status ACTIVE for P001 and P002."))
