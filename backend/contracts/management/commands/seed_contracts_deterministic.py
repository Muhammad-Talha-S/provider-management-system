import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

from contracts.models import Contract, ContractProviderStatus
from providers.models import Provider


# ---------------------------
# Helpers
# ---------------------------

def _parse_iso_z(dt_str: str) -> datetime:
    """
    Parse ISO strings like '2026-01-15T08:00:00.000Z' into an aware datetime.
    """
    if not dt_str:
        raise ValueError("Empty datetime string")
    s = dt_str.replace("Z", "+00:00")
    dt = datetime.fromisoformat(s)
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone=timezone.UTC)
    return dt


def _dedupe_preserve_order(items: List[str]) -> List[str]:
    seen = set()
    out = []
    for x in items:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


def _domain_roles(contract_type: str) -> Tuple[List[str], List[str]]:
    """
    Deterministic mapping from contractType -> domains + roles.
    Used only when the payload doesn't already contain allowedConfiguration.
    """
    ct = (contract_type or "").lower()

    domains: List[str] = []
    roles: List[str] = []

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
    pms = [
        "Max Mustermann", "Stefan Wagner", "Lena Fischer", "Jonas Becker", "Miriam Schneider",
        "Tobias Klein", "Anna Schmidt", "Laura Weber", "Felix Hoffmann", "Sophie Neumann"
    ]
    legals = [
        "Dr. Jane Doe", "Dr. Elisa König", "Dr. Markus Braun", "Dr. Julia Hartmann", "Dr. Leon Wagner",
        "Dr. Hannah Meyer", "Dr. Tim Schuster", "Dr. Sarah Koch", "Dr. Paul Richter", "Dr. Nina Bauer"
    ]
    admins = [
        "Anna Schmidt", "Maria Hoffmann", "Paul Keller", "Lisa Wagner", "Daniela Krüger",
        "Jan Peters", "Nora Lehmann", "Tim Berger", "Klara Busch", "Oliver Brandt"
    ]

    return {
        "procurementManager": pms[idx % len(pms)],
        "legalCounsel": legals[idx % len(legals)],
        "contractAdministrator": admins[idx % len(admins)],
    }


def _accepted_sr_types(target_persons: int, contract_type: str):
    ct = (contract_type or "").lower()
    types = [{"type": "SINGLE", "isAccepted": True, "biddingDeadlineDays": 7, "offerCycles": 2}]

    if (target_persons or 1) >= 2:
        types.append({"type": "TEAM", "isAccepted": True, "biddingDeadlineDays": 14, "offerCycles": 2})

    allow_multi = any(k in ct for k in ["devops", "cloud", "platform", "observability"])
    types.append({"type": "MULTI", "isAccepted": bool(allow_multi), "biddingDeadlineDays": 10, "offerCycles": 2})

    allow_wc = any(k in ct for k in ["operations", "cloud operations", "security operations", "documentation"])
    types.append({"type": "WORK_CONTRACT", "isAccepted": bool(allow_wc), "biddingDeadlineDays": 21, "offerCycles": 1})

    return types


def _best_effort_start_dt(item: Dict[str, Any]) -> Optional[datetime]:
    """
    Supports both payloads:
      - old: item["startDate"]
      - new: item["externalSnapshot"]["startDate"]
    """
    if item.get("startDate"):
        return _parse_iso_z(item["startDate"])
    ext = item.get("externalSnapshot") or item.get("external_snapshot") or {}
    if isinstance(ext, dict) and ext.get("startDate"):
        return _parse_iso_z(ext["startDate"])
    return None


def _get_contract_type(item: Dict[str, Any]) -> str:
    if item.get("contractType"):
        return str(item.get("contractType") or "")
    ext = item.get("externalSnapshot") or item.get("external_snapshot") or {}
    if isinstance(ext, dict) and ext.get("contractType"):
        return str(ext.get("contractType") or "")
    return ""


def _get_description(item: Dict[str, Any]) -> str:
    # new payload uses scopeOfWork already; old uses description
    if item.get("scopeOfWork"):
        return str(item.get("scopeOfWork") or "")
    if item.get("description"):
        return str(item.get("description") or "")
    ext = item.get("externalSnapshot") or item.get("external_snapshot") or {}
    if isinstance(ext, dict):
        if ext.get("description"):
            return str(ext.get("description") or "")
    return ""


def _get_budget_currency(item: Dict[str, Any]) -> str:
    # old payload: item["budget"]["currency"]
    budget = item.get("budget") or {}
    if isinstance(budget, dict) and budget.get("currency"):
        return str(budget.get("currency") or "EUR")

    # new payload: externalSnapshot.budget.currency
    ext = item.get("externalSnapshot") or item.get("external_snapshot") or {}
    if isinstance(ext, dict):
        b2 = ext.get("budget") or {}
        if isinstance(b2, dict) and b2.get("currency"):
            return str(b2.get("currency") or "EUR")

    # new payload already has allowedConfiguration.pricingRules.currency
    cfg = item.get("allowedConfiguration") or item.get("allowed_configuration") or {}
    if isinstance(cfg, dict):
        pr = cfg.get("pricingRules") or {}
        if isinstance(pr, dict) and pr.get("currency"):
            return str(pr.get("currency") or "EUR")

    return "EUR"


def _get_target_persons(item: Dict[str, Any]) -> int:
    if isinstance(item.get("targetPersons"), int):
        return int(item["targetPersons"])
    ext = item.get("externalSnapshot") or item.get("external_snapshot") or {}
    if isinstance(ext, dict) and isinstance(ext.get("targetPersons"), int):
        return int(ext["targetPersons"])
    return 1


# ---------------------------
# Command
# ---------------------------

class Command(BaseCommand):
    help = "Seed contracts deterministically (supports both old mock JSON and Group2 payload JSON)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            type=str,
            default=str(Path(settings.BASE_DIR).parent / "contracts_mock_data.json"),
            help="Path to contracts JSON (old mock or new group2 payload).",
        )

    def handle(self, *args, **options):
        json_path = Path(options["path"])
        if not json_path.exists():
            raise FileNotFoundError(f"JSON file not found: {json_path}")

        raw_contracts = json.loads(json_path.read_text(encoding="utf-8"))
        if not isinstance(raw_contracts, list):
            raise ValueError("JSON root must be a list of contracts.")

        # Providers
        p1 = Provider.objects.get(id="P001")
        p2 = Provider.objects.get(id="P002")
        p3 = Provider.objects.get(id="P003")

        exp_levels = ["Junior", "Intermediate", "Senior", "Expert"]
        tech_levels = ["Basic", "Intermediate", "Advanced", "Expert"]

        created_count = 0
        updated_count = 0

        for idx, item in enumerate(raw_contracts):
            if not isinstance(item, dict):
                continue

            contract_id = item.get("contractId") or item.get("id")
            if not contract_id:
                continue

            contract_id = str(contract_id)
            title = item.get("title", "") or ""

            # -------- Dates --------
            # Prefer explicit publishingDate/offerDeadlineAt if present (new Group2 payload)
            publishing_date = None
            offer_deadline_at = None

            if item.get("publishingDate"):
                publishing_date = parse_date(item.get("publishingDate"))
            if item.get("offerDeadlineAt"):
                offer_deadline_at = parse_datetime(item.get("offerDeadlineAt"))

            # Otherwise derive from startDate (old mock payload)
            if not publishing_date or not offer_deadline_at:
                start_dt = _best_effort_start_dt(item)
                if start_dt:
                    publishing_date = (start_dt - timedelta(days=7)).date()
                    offer_deadline_at = (start_dt - timedelta(days=2)).astimezone(timezone.UTC)
                    offer_deadline_at = offer_deadline_at.replace(hour=23, minute=59, second=59, microsecond=0)

            # If still missing, fallback to "today" deterministic-ish (but stable enough)
            if not publishing_date:
                publishing_date = timezone.now().date() - timedelta(days=7)
            if not offer_deadline_at:
                offer_deadline_at = timezone.now().astimezone(timezone.UTC).replace(hour=23, minute=59, second=59, microsecond=0)

            # -------- Status --------
            # If JSON already includes status, respect it; else use deterministic mapping.
            status_value = (item.get("status") or "").upper().strip()
            if status_value not in {"DRAFT", "PUBLISHED", "IN_NEGOTIATION", "ACTIVE", "EXPIRED"}:
                status_value = _status_for_index(idx)

            # -------- Config --------
            # If Group2 payload already provides allowedConfiguration, use it.
            cfg = item.get("allowedConfiguration")
            if not isinstance(cfg, dict):
                contract_type = _get_contract_type(item)
                domains, roles = _domain_roles(contract_type)
                currency = _get_budget_currency(item)

                cfg = {
                    "domains": domains,
                    "roles": roles,
                    "experienceLevels": exp_levels,
                    "technologyLevels": tech_levels,
                    "acceptedServiceRequestTypes": _accepted_sr_types(_get_target_persons(item), contract_type),
                    "pricingRules": {
                        "currency": currency,
                        "maxDailyRates": [
                            {"role": "*", "experienceLevel": "*", "technologyLevel": "*", "maxDailyRate": 2500}
                        ],
                    },
                    "constraints": {"mustHaveMax": 3, "niceToHaveMax": 5},
                }

            # Ensure essentials exist (in case a partial config was provided)
            cfg.setdefault("experienceLevels", exp_levels)
            cfg.setdefault("technologyLevels", tech_levels)
            cfg.setdefault("pricingRules", {"currency": _get_budget_currency(item), "maxDailyRates": []})
            if "currency" not in (cfg.get("pricingRules") or {}):
                cfg["pricingRules"]["currency"] = _get_budget_currency(item)
            if "maxDailyRates" not in (cfg.get("pricingRules") or {}):
                cfg["pricingRules"]["maxDailyRates"] = []

            # -------- Other fields --------
            stakeholders = item.get("stakeholders")
            if not isinstance(stakeholders, dict):
                stakeholders = _stakeholders_for_index(idx)

            scope_of_work = _get_description(item) or ""
            terms = item.get("termsAndConditions") or item.get("terms_and_conditions") or ""
            if not terms:
                terms = "Standard framework terms incl. confidentiality, GDPR, IP ownership, and liability clauses."

            weighting = item.get("weighting")
            if not isinstance(weighting, dict):
                weighting = {"functional": 60, "commercial": 40} if status_value == "PUBLISHED" else {"functional": 50, "commercial": 50}

            versions = item.get("versionsAndDocuments")
            if not isinstance(versions, list):
                # create a minimal versionsAndDocuments if missing
                versions = [
                    {
                        "version": 1,
                        "versionDate": str(publishing_date),
                        "status": "SIGNED" if status_value == "ACTIVE" else ("DRAFT" if status_value == "IN_NEGOTIATION" else "PUBLISHED"),
                        "changeSummary": "Seeded deterministically",
                        "documents": [
                            {
                                "name": f"{contract_id}_v1.pdf",
                                "type": "PDF",
                                "url": f"https://group2.example/documents/{contract_id}/v1.pdf",
                            }
                        ],
                    }
                ]

            external_snapshot = item.get("externalSnapshot")
            if external_snapshot is None:
                # store raw item for audit/debug
                external_snapshot = item

            defaults = {
                "title": title,
                "kind": (item.get("kind") or "SERVICE").upper(),
                "status": status_value,
                "publishing_date": publishing_date,
                "offer_deadline_at": offer_deadline_at,
                "stakeholders": stakeholders,
                "scope_of_work": scope_of_work,
                "terms_and_conditions": terms,
                "weighting": weighting,
                "config": cfg,
                "versions_and_documents": versions,
                "external_snapshot": external_snapshot,
            }

            contract, created = Contract.objects.update_or_create(id=contract_id, defaults=defaults)
            created_count += 1 if created else 0
            updated_count += 0 if created else 1

            # -------- Awards / Provider statuses (CONSISTENT) --------
            # - PUBLISHED: no awards
            # - IN_NEGOTIATION: set P001 + alt provider to IN_NEGOTIATION
            # - ACTIVE: set P001 + alt provider to ACTIVE
            # - EXPIRED: optional; we won't auto-create awards
            if status_value in {"IN_NEGOTIATION", "ACTIVE"}:
                second_provider = p2 if (idx % 2 == 0) else p3

                cps_status = "ACTIVE" if status_value == "ACTIVE" else "IN_NEGOTIATION"
                awarded_at = timezone.now() if cps_status == "ACTIVE" else None

                ContractProviderStatus.objects.update_or_create(
                    contract=contract,
                    provider=p1,
                    defaults={
                        "status": cps_status,
                        "note": f"Seeded provider status for {p1.id} based on contract.status={status_value}",
                        "awarded_at": awarded_at,
                    },
                )
                ContractProviderStatus.objects.update_or_create(
                    contract=contract,
                    provider=second_provider,
                    defaults={
                        "status": cps_status,
                        "note": f"Seeded provider status for {second_provider.id} based on contract.status={status_value}",
                        "awarded_at": awarded_at,
                    },
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed complete. Contracts created: {created_count}, updated: {updated_count}. "
                f"Awards applied only for IN_NEGOTIATION/ACTIVE (P001 + alternating P002/P003)."
            )
        )
