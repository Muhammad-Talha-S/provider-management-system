import json
from datetime import datetime, timedelta
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from contracts.models import Contract, ContractProviderStatus
from providers.models import Provider


def _parse_iso_z(dt_str: str) -> datetime:
    """
    Parse ISO strings like '2026-01-15T08:00:00.000Z' into an aware datetime.
    """
    if not dt_str:
        raise ValueError("Empty datetime string")
    # Convert trailing Z to +00:00 for fromisoformat
    s = dt_str.replace("Z", "+00:00")
    dt = datetime.fromisoformat(s)
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone=timezone.UTC)
    return dt


def _dedupe_preserve_order(items):
    seen = set()
    out = []
    for x in items:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


def _domain_roles(contract_type: str):
    """
    Deterministic mapping from contractType -> domains + roles.
    """
    ct = (contract_type or "").lower()

    domains = []
    roles = []

    if "cloud" in ct or "finops" in ct:
        domains += ["Cloud Services", "Cloud Operations", "FinOps"]
        roles += ["Cloud Architect", "Cloud Engineer", "FinOps Analyst", "Site Reliability Engineer"]

    if "devops" in ct or "ci/cd" in ct or "cicd" in ct or "release" in ct:
        domains += ["DevOps", "Platform Engineering"]
        roles += ["DevOps Engineer", "Platform Engineer", "Release Engineer", "SRE Engineer"]

    if "security" in ct or "application security" in ct:
        domains += ["Application Security", "Security Engineering", "Security Operations"]
        roles += ["Security Engineer", "AppSec Engineer", "IAM Engineer"]

    if "database" in ct or "postgres" in ct or "migration" in ct:
        domains += ["Database Engineering", "Database Optimization", "Data Engineering"]
        roles += ["Database Engineer", "Data Engineer", "PostgreSQL Specialist"]

    if "observability" in ct or "monitoring" in ct:
        domains += ["Monitoring & Observability", "Platform Engineering"]
        roles += ["Observability Engineer", "SRE Engineer", "DevOps Engineer"]

    if "documentation" in ct:
        domains += ["Documentation"]
        roles += ["Technical Writer", "API Technical Writer", "Developer Advocate"]

    if "frontend" in ct or "ux" in ct or "accessibility" in ct:
        domains += ["Frontend Engineering", "UX"]
        roles += ["Frontend Developer", "UX Engineer", "Accessibility Specialist"]

    if "ocr" in ct or "document" in ct:
        domains += ["OCR & Document Automation", "Data Engineering"]
        roles += ["OCR Engineer", "Backend Developer", "Data Engineer"]

    if "operations" in ct or "incident" in ct or "backup" in ct:
        domains += ["Operations", "Cloud Operations"]
        roles += ["Cloud Operations Engineer", "Incident Manager", "Reliability Engineer"]

    if not domains:
        domains = ["Software Development"]
        roles = ["Full Stack Developer", "Backend Developer"]

    return _dedupe_preserve_order(domains), _dedupe_preserve_order(roles)


def _status_for_index(idx: int) -> str:
    """
    Deterministic variety:
      - C001..C010 => PUBLISHED
      - C011..C015 => IN_NEGOTIATION
      - C016..C020 => ACTIVE
    """
    if idx < 10:
        return "PUBLISHED"
    if idx < 15:
        return "IN_NEGOTIATION"
    return "ACTIVE"


def _stakeholders_for_index(idx: int) -> dict:
    pms = ["Max Mustermann", "Stefan Wagner", "Lena Fischer", "Jonas Becker", "Miriam Schneider",
           "Tobias Klein", "Anna Schmidt", "Laura Weber", "Felix Hoffmann", "Sophie Neumann"]
    legals = ["Dr. Jane Doe", "Dr. Elisa König", "Dr. Markus Braun", "Dr. Julia Hartmann", "Dr. Leon Wagner",
              "Dr. Hannah Meyer", "Dr. Tim Schuster", "Dr. Sarah Koch", "Dr. Paul Richter", "Dr. Nina Bauer"]
    admins = ["Anna Schmidt", "Maria Hoffmann", "Paul Keller", "Lisa Wagner", "Daniela Krüger",
              "Jan Peters", "Nora Lehmann", "Tim Berger", "Klara Busch", "Oliver Brandt"]

    return {
        "procurementManager": pms[idx % len(pms)],
        "legalCounsel": legals[idx % len(legals)],
        "contractAdministrator": admins[idx % len(admins)],
    }


def _accepted_sr_types(target_persons: int, contract_type: str):
    ct = (contract_type or "").lower()
    types = [
        {"type": "SINGLE", "isAccepted": True, "biddingDeadlineDays": 7, "offerCycles": 2},
    ]

    if (target_persons or 1) >= 2:
        types.append({"type": "TEAM", "isAccepted": True, "biddingDeadlineDays": 14, "offerCycles": 2})

    allow_multi = any(k in ct for k in ["devops", "cloud", "platform", "observability"])
    types.append({"type": "MULTI", "isAccepted": bool(allow_multi), "biddingDeadlineDays": 10, "offerCycles": 2})

    allow_wc = any(k in ct for k in ["operations", "cloud operations", "security operations", "documentation"])
    types.append({"type": "WORK_CONTRACT", "isAccepted": bool(allow_wc), "biddingDeadlineDays": 21, "offerCycles": 1})

    return types


class Command(BaseCommand):
    help = "Seed contracts from contracts_mock_data.json deterministically and award to providers."

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            type=str,
            default=str(Path(settings.BASE_DIR).parent / "contracts_mock_data.json"),
            help="Path to contracts_mock_data.json (default: repo root/contracts_mock_data.json)",
        )

    def handle(self, *args, **options):
        json_path = Path(options["path"])
        if not json_path.exists():
            raise FileNotFoundError(f"JSON file not found: {json_path}")

        raw_contracts = json.loads(json_path.read_text(encoding="utf-8"))

        # Providers
        p1 = Provider.objects.get(id="P001")
        p2 = Provider.objects.get(id="P002")
        p3 = Provider.objects.get(id="P003")

        exp_levels = ["Junior", "Intermediate", "Senior", "Expert"]
        tech_levels = ["Basic", "Intermediate", "Advanced", "Expert"]

        created_count = 0
        updated_count = 0

        for idx, item in enumerate(raw_contracts):
            contract_id = item["contractId"]
            title = item.get("title", "")

            start_dt = _parse_iso_z(item["startDate"])
            publishing_date = (start_dt - timedelta(days=7)).date()

            offer_deadline_at = (start_dt - timedelta(days=2)).astimezone(timezone.UTC)
            offer_deadline_at = offer_deadline_at.replace(hour=23, minute=59, second=59, microsecond=0)

            status = _status_for_index(idx)
            domains, roles = _domain_roles(item.get("contractType", ""))

            config = {
                "domains": domains,
                "roles": roles,
                "experienceLevels": exp_levels,
                "technologyLevels": tech_levels,
                "acceptedServiceRequestTypes": _accepted_sr_types(item.get("targetPersons", 1), item.get("contractType", "")),
                "pricingRules": {
                    "currency": (item.get("budget") or {}).get("currency", "EUR"),
                    # permissive to avoid demo rejections
                    "maxDailyRates": [{"role": "*", "experienceLevel": "*", "technologyLevel": "*", "maxDailyRate": 2500}],
                },
                "constraints": {"mustHaveMax": 3, "niceToHaveMax": 5},
            }

            weighting = {"functional": 60, "commercial": 40} if status == "PUBLISHED" else {"functional": 50, "commercial": 50}

            versions_and_documents = [
                {
                    "version": 1,
                    "versionDate": str(publishing_date),
                    "status": "SIGNED" if status == "ACTIVE" else ("DRAFT" if status == "IN_NEGOTIATION" else "PUBLISHED"),
                    "changeSummary": "Seeded from contracts_mock_data.json",
                    "documents": [
                        {
                            "name": f"{contract_id}_v1.pdf",
                            "type": "PDF",
                            "url": f"https://group2.example/documents/{contract_id}/v1.pdf",
                        }
                    ],
                }
            ]

            defaults = {
                "title": title,
                "kind": "SERVICE",
                "status": status,
                "publishing_date": publishing_date,
                "offer_deadline_at": offer_deadline_at,
                "stakeholders": _stakeholders_for_index(idx),
                "scope_of_work": item.get("description", ""),
                "terms_and_conditions": "Standard framework terms incl. confidentiality, GDPR, IP ownership, and liability clauses.",
                "weighting": weighting,
                "config": config,
                "versions_and_documents": versions_and_documents,
                "external_snapshot": item,  # raw payload for audit/debug
            }

            contract, created = Contract.objects.update_or_create(id=contract_id, defaults=defaults)
            created_count += 1 if created else 0
            updated_count += 0 if created else 1

            # Awards:
            # - always award to P001
            # - alternate second award: C001->P002, C002->P003, C003->P002, ...
            second_provider = p2 if (idx % 2 == 0) else p3

            ContractProviderStatus.objects.update_or_create(
                contract=contract,
                provider=p1,
                defaults={"status": "ACTIVE", "note": "Seeded award to P001", "awarded_at": timezone.now()},
            )
            ContractProviderStatus.objects.update_or_create(
                contract=contract,
                provider=second_provider,
                defaults={"status": "ACTIVE", "note": f"Seeded alternative award to {second_provider.id}", "awarded_at": timezone.now()},
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed complete. Contracts created: {created_count}, updated: {updated_count}. "
                f"Awards set for P001 + alternating P002/P003."
            )
        )
