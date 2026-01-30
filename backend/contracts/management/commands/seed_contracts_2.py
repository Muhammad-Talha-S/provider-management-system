from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

from contracts.models import Contract, ContractProviderStatus
from providers.models import Provider


# -------------------------------------------------------------------
# Static mock contracts (exactly as requested)
# -------------------------------------------------------------------
CONTRACTS_PUBLIC: List[Dict[str, Any]] = [
    {
        "contractId": "C030",
        "title": "Software Development Services 2024",
        "kind": "SERVICE",
        "status": "PUBLISHED",
        "publishingDate": "2026-01-11",
        "offerDeadlineAt": "2026-02-15T00:00:00Z",
        "stakeholders": {
            "procurementManager": "Max Mustermann",
            "legalCounsel": "Dr. Jane Doe",
            "contractAdministrator": "Anna Schmidt",
        },
        "scopeOfWork": "High-level scope text ...",
        "termsAndConditions": "T&C text ...",
        "weighting": {"functional": 60, "commercial": 40},
        "allowedConfiguration": {
            "domains": ["Web Development", "Cloud Services", "DevOps"],
            "roles": ["Full Stack Developer", "Backend Developer", "Frontend Developer", "DevOps Engineer"],
            "experienceLevels": ["Junior", "Mid", "Senior", "Expert"],
            "technologyLevels": ["Basic", "Intermediate", "Advanced", "Expert"],
            "acceptedServiceRequestTypes": [
                {"type": "SINGLE", "isAccepted": True, "biddingDeadlineDays": 7, "offerCycles": 2},
                {"type": "MULTI", "isAccepted": True, "biddingDeadlineDays": 10, "offerCycles": 2},
                {"type": "TEAM", "isAccepted": True, "biddingDeadlineDays": 14, "offerCycles": 2},
                {"type": "WORK_CONTRACT", "isAccepted": True, "biddingDeadlineDays": 21, "offerCycles": 1},
            ],
            "pricingRules": {
                "currency": "EUR",
                "maxDailyRates": [
                    {"role": "Junior Developer", "experienceLevel": "Junior", "technologyLevel": "Basic", "maxDailyRate": 500},
                    {"role": "Mid Developer", "experienceLevel": "Mid", "technologyLevel": "Intermediate", "maxDailyRate": 700},
                    {"role": "Senior Developer", "experienceLevel": "Senior", "technologyLevel": "Advanced", "maxDailyRate": 900},
                    {"role": "Expert Developer", "experienceLevel": "Expert", "technologyLevel": "Expert", "maxDailyRate": 1000},
                ],
            },
        },
        "versionsAndDocuments": [
            {
                "version": 1,
                "versionDate": "2024-01-01",
                "status": "SIGNED",
                "changeSummary": "Initial contract version",
                "documents": [
                    {
                        "name": "Contract_v1.pdf",
                        "type": "PDF",
                        "url": "https://group2.example/documents/C001/v1.pdf",
                        "sha256": "optional-hash",
                    }
                ],
            },
            {
                "version": 2,
                "versionDate": "2024-08-15",
                "status": "SIGNED",
                "changeSummary": "Updated pricing limits and tech level requirements",
                "documents": [
                    {
                        "name": "Contract_v2.pdf",
                        "type": "PDF",
                        "url": "https://group2.example/documents/C001/v2.pdf",
                    }
                ],
            },
        ],
    },
    {
        "contractId": "C031",
        "title": "Web Application Development Framework Agreement",
        "kind": "SERVICE",
        "status": "DRAFT",
        "publishingDate": "2026-03-05",
        "offerDeadlineAt": "2026-02-15T00:00:00Z",
        "stakeholders": {
            "procurementManager": "Stefan Wagner",
            "legalCounsel": "Dr. Elisa König",
            "contractAdministrator": "Maria Hoffmann",
        },
        "scopeOfWork": "Frontend and backend development of enterprise web applications using modern frameworks.",
        "termsAndConditions": "Framework agreement T&C including IP and data protection clauses.",
        "weighting": {"functional": 50, "commercial": 50},
        "allowedConfiguration": {
            "domains": ["Web Development"],
            "roles": ["Frontend Developer", "Backend Developer", "Full Stack Developer"],
            "experienceLevels": ["Junior", "Mid", "Senior"],
            "technologyLevels": ["Basic", "Intermediate", "Advanced"],
            "acceptedServiceRequestTypes": [
                {"type": "SINGLE", "isAccepted": True, "biddingDeadlineDays": 7, "offerCycles": 3},
                {"type": "MULTI", "isAccepted": True, "biddingDeadlineDays": 10, "offerCycles": 2},
            ],
            "pricingRules": {
                "currency": "EUR",
                "maxDailyRates": [
                    {"role": "Frontend Developer", "experienceLevel": "Junior", "technologyLevel": "Basic", "maxDailyRate": 450},
                    {"role": "Full Stack Developer", "experienceLevel": "Senior", "technologyLevel": "Advanced", "maxDailyRate": 880},
                ],
            },
        },
        "versionsAndDocuments": [
            {
                "version": 1,
                "versionDate": "2026-03-05",
                "status": "DRAFT",
                "changeSummary": "Initial draft for internal review",
                "documents": [
                    {
                        "name": "Web_Framework_Contract_v1_draft.pdf",
                        "type": "PDF",
                        "url": "https://group2.example/documents/C003/v1-draft.pdf",
                    }
                ],
            }
        ],
    },
]


# -------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------
def _parse_date_safe(v: Optional[str]):
    return parse_date(v) if v else None


def _parse_dt_safe(v: Optional[str]):
    # parse_datetime handles "Z" in Django reasonably; still guard.
    return parse_datetime(v) if v else None


# -------------------------------------------------------------------
# Command
# -------------------------------------------------------------------
class Command(BaseCommand):
    help = "Seed ONLY the two static public mock contracts (C030, C031)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--with-awards",
            action="store_true",
            help="If set, creates ContractProviderStatus for ACTIVE/IN_NEGOTIATION contracts (P001 + alternating P002/P003).",
        )

    def handle(self, *args, **options):
        with_awards: bool = bool(options.get("with_awards"))

        # Providers are only required if awards enabled OR if you later change statuses.
        p1 = p2 = p3 = None
        if with_awards:
            p1 = Provider.objects.get(id="P001")
            p2 = Provider.objects.get(id="P002")
            p3 = Provider.objects.get(id="P003")

        created = 0
        updated = 0

        for idx, item in enumerate(CONTRACTS_PUBLIC):
            contract_id = str(item["contractId"])
            status_value = str(item.get("status") or "DRAFT").upper().strip()
            kind_value = str(item.get("kind") or "SERVICE").upper().strip()

            publishing_date = _parse_date_safe(item.get("publishingDate"))
            offer_deadline_at = _parse_dt_safe(item.get("offerDeadlineAt"))

            defaults = {
                "title": item.get("title") or "",
                "kind": kind_value if kind_value else "SERVICE",
                "status": status_value if status_value else "DRAFT",
                "publishing_date": publishing_date,
                "offer_deadline_at": offer_deadline_at,
                "stakeholders": item.get("stakeholders"),
                "scope_of_work": item.get("scopeOfWork") or "",
                "terms_and_conditions": item.get("termsAndConditions") or "",
                "weighting": item.get("weighting"),
                "config": item.get("allowedConfiguration"),
                "versions_and_documents": item.get("versionsAndDocuments"),
                "external_snapshot": item,  # raw for audit/debug
            }

            obj, was_created = Contract.objects.update_or_create(id=contract_id, defaults=defaults)
            if was_created:
                created += 1
            else:
                updated += 1

            # ---- Awards / provider statuses (consistent) ----
            # Only if caller asked for it, and only if contract itself is IN_NEGOTIATION/ACTIVE.
            # PUBLISHED and DRAFT will not create awards => prevents "published but awarded" inconsistency.
            if with_awards and status_value in {"IN_NEGOTIATION", "ACTIVE"}:
                assert p1 and p2 and p3
                second_provider = p2 if (idx % 2 == 0) else p3
                cps_status = "ACTIVE" if status_value == "ACTIVE" else "IN_NEGOTIATION"
                awarded_at = timezone.now() if cps_status == "ACTIVE" else None

                ContractProviderStatus.objects.update_or_create(
                    contract=obj,
                    provider=p1,
                    defaults={
                        "status": cps_status,
                        "note": f"Seeded via seed_contracts_public_mock for {obj.id}",
                        "awarded_at": awarded_at,
                    },
                )
                ContractProviderStatus.objects.update_or_create(
                    contract=obj,
                    provider=second_provider,
                    defaults={
                        "status": cps_status,
                        "note": f"Seeded alternative via seed_contracts_public_mock for {obj.id}",
                        "awarded_at": awarded_at,
                    },
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded public contracts. created={created}, updated={updated}. "
                f"awards={'on' if with_awards else 'off'}"
            )
        )
