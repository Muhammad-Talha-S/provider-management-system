import csv
import json
import os
import zipfile
from pathlib import Path
from datetime import datetime
from typing import Any, Callable

from django.core.management.base import BaseCommand
from django.utils.timezone import is_aware


# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------

def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)

def iso(v: Any) -> str:
    """CSV-safe string conversion."""
    if v is None:
        return ""
    if hasattr(v, "isoformat"):
        # datetime/date
        return v.isoformat()
    return str(v)

def json_to_str(v: Any) -> str:
    """Turn JSONField content into stable string."""
    if v is None:
        return ""
    # Lists become pipe-separated strings; dict becomes JSON string
    if isinstance(v, list):
        return " | ".join(str(x) for x in v)
    if isinstance(v, dict):
        return json.dumps(v, ensure_ascii=False)
    return str(v)

def write_csv(path: Path, headers: list[str], rows: list[list[Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(headers)
        for r in rows:
            w.writerow([iso(x) for x in r])

def zip_folder(folder: Path, zip_path: Path) -> None:
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for p in folder.rglob("*"):
            if p.is_file():
                z.write(p, arcname=p.relative_to(folder))

def write_readme(path: Path, schema_version: str, ts: str, files: list[str]) -> None:
    content = f"""# Reporting Data Export (CSV)

Generated at (UTC): {ts}
Schema version: {schema_version}

## Files
{os.linesep.join([f"- {f}" for f in files])}

## Join keys (recommended)
- provider_id appears on most tables for easy joins
- contracts: contract_id
- procurement: service_request_id, service_offer_id, service_order_id

## Notes
- JSON fields are flattened:
  - lists -> "a | b | c"
  - dicts -> JSON string
- This is a full snapshot export.
"""
    path.write_text(content, encoding="utf-8")

def write_data_dictionary(path: Path, entries: list[dict]) -> None:
    headers = ["file", "table", "column", "type", "notes"]
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(headers)
        for e in entries:
            w.writerow([e["file"], e["table"], e["column"], e["type"], e.get("notes", "")])


# ------------------------------------------------------------
# Explicit export definitions (stable schema for BI)
# ------------------------------------------------------------

# Each export: file name, Django model import path, columns, value extractors
# We use explicit columns so BI won't break when you add fields later.

EXPORTS = [
    # Providers
    {
        "file": "providers.csv",
        "table": "providers.Provider",
        "columns": [
            "provider_id", "name", "contact_name", "contact_email", "contact_phone",
            "address", "email_notifications", "sms_notifications", "preferred_language",
            "status", "created_at",
        ],
        "rows": lambda Provider: [
            [
                p.id, p.name, p.contact_name, p.contact_email, p.contact_phone,
                p.address, p.email_notifications, p.sms_notifications, p.preferred_language,
                p.status, p.created_at
            ]
            for p in Provider.objects.all().order_by("id")
        ],
        "dictionary": [
            ("provider_id", "string", "Primary key (P001 etc.)"),
        ],
    },

    # Users (incl Specialists)
    {
        "file": "users.csv",
        "table": "accounts.User",
        "columns": [
            "user_id", "provider_id", "name", "email", "role", "status", "created_at",
            # specialist attributes
            "material_number", "experience_level", "technology_level", "performance_grade",
            "average_daily_rate", "skills", "availability",
            "service_requests_completed", "service_orders_active",
            # auth flags (sometimes useful for filtering)
            "is_active", "is_staff",
        ],
        "rows": lambda User: [
            [
                u.id, u.provider_id, u.name, u.email, u.role, u.status, u.created_at,
                u.material_number, u.experience_level, u.technology_level, u.performance_grade,
                u.average_daily_rate, json_to_str(u.skills), u.availability,
                u.service_requests_completed, u.service_orders_active,
                u.is_active, u.is_staff,
            ]
            for u in User.objects.select_related("provider").all().order_by("id")
        ],
        "dictionary": [
            ("skills", "string", 'Flattened list: "Skill1 | Skill2 | ..."'),
        ],
    },

    # Contracts
    {
        "file": "contracts.csv",
        "table": "contracts.Contract",
        "columns": [
            "contract_id", "title", "status", "kind",
            "published_at", "offer_deadline", "start_date", "end_date",
            "awarded_provider_id",
            "functional_weight", "commercial_weight",
            "scope_of_work", "terms_and_conditions",
            # flattened JSON config fields (BI-friendly)
            "accepted_request_types", "allowed_domains", "allowed_roles", "experience_levels",
        ],
        "rows": lambda Contract: [
            [
                c.id, c.title, c.status, c.kind,
                c.published_at, c.offer_deadline, c.start_date, c.end_date,
                c.awarded_provider_id,
                c.functional_weight, c.commercial_weight,
                c.scope_of_work, c.terms_and_conditions,
                json_to_str(c.accepted_request_types),
                json_to_str(c.allowed_domains),
                json_to_str(c.allowed_roles),
                json_to_str(c.experience_levels),
            ]
            for c in Contract.objects.select_related("awarded_provider").all().order_by("id")
        ],
        "dictionary": [
            ("accepted_request_types", "string", "Flattened list"),
            ("allowed_domains", "string", "Flattened list"),
            ("allowed_roles", "string", "Flattened list"),
            ("experience_levels", "string", "Flattened list"),
        ],
    },

    # Contract Awards
    {
        "file": "contract_awards.csv",
        "table": "contracts.ContractAward",
        "columns": [
            "contract_id", "provider_id", "awarded_at", "created_by_system", "note"
        ],
        "rows": lambda ContractAward: [
            [a.contract_id, a.provider_id, a.awarded_at, a.created_by_system, a.note]
            for a in ContractAward.objects.select_related("contract", "provider").all().order_by("awarded_at")
        ],
        "dictionary": [],
    },

    # Contract Offers
    {
        "file": "contract_offers.csv",
        "table": "contracts.ContractOffer",
        "columns": [
            "contract_offer_id", "contract_id", "provider_id", "created_by_user_id",
            "status", "proposed_daily_rate", "proposed_terms", "note",
            "submitted_at", "created_at",
        ],
        "rows": lambda ContractOffer: [
            [
                o.id, o.contract_id, o.provider_id, o.created_by_id,
                o.status, o.proposed_daily_rate, o.proposed_terms, o.note,
                o.submitted_at, o.created_at
            ]
            for o in ContractOffer.objects.select_related("contract", "provider", "created_by").all().order_by("created_at")
        ],
        "dictionary": [],
    },

    # Service Requests
    {
        "file": "service_requests.csv",
        "table": "procurement.ServiceRequest",
        "columns": [
            "service_request_id", "linked_contract_id", "title", "type", "status",
            "offer_deadline_at", "cycles",
            "role", "technology", "experience_level",
            "start_date", "end_date",
            "total_man_days", "onsite_days", "performance_location",
            "required_languages", "must_have_criteria", "nice_to_have_criteria",
            "task_description",
            "created_at",
        ],
        "rows": lambda ServiceRequest: [
            [
                sr.id, sr.linked_contract_id, sr.title, sr.type, sr.status,
                sr.offer_deadline_at, sr.cycles,
                sr.role, sr.technology, sr.experience_level,
                sr.start_date, sr.end_date,
                sr.total_man_days, sr.onsite_days, sr.performance_location,
                json_to_str(sr.required_languages),
                json_to_str(sr.must_have_criteria),
                json_to_str(sr.nice_to_have_criteria),
                sr.task_description,
                sr.created_at,
            ]
            for sr in ServiceRequest.objects.all().order_by("created_at")
        ],
        "dictionary": [
            ("required_languages", "string", "Flattened list"),
            ("must_have_criteria", "string", "Flattened list"),
            ("nice_to_have_criteria", "string", "Flattened list"),
        ],
    },

    # Service Offers
    {
        "file": "service_offers.csv",
        "table": "procurement.ServiceOffer",
        "columns": [
            "service_offer_id", "service_request_id", "provider_id", "specialist_user_id", "created_by_user_id",
            "daily_rate", "travel_cost_per_onsite_day", "total_cost",
            "contractual_relationship", "subcontractor_company",
            "must_have_match_percentage", "nice_to_have_match_percentage",
            "status", "submitted_at", "created_at",
        ],
        "rows": lambda ServiceOffer: [
            [
                so.id, so.service_request_id, so.provider_id, so.specialist_id, so.created_by_id,
                so.daily_rate, so.travel_cost_per_onsite_day, so.total_cost,
                so.contractual_relationship, so.subcontractor_company,
                so.must_have_match_percentage, so.nice_to_have_match_percentage,
                so.status, so.submitted_at, so.created_at
            ]
            for so in ServiceOffer.objects.select_related("service_request", "provider", "specialist", "created_by").all().order_by("created_at")
        ],
        "dictionary": [],
    },

    # Service Orders
    {
        "file": "service_orders.csv",
        "table": "procurement.ServiceOrder",
        "columns": [
            "service_order_id", "service_offer_id", "service_request_id",
            "provider_id", "specialist_user_id",
            "title", "start_date", "end_date", "location",
            "man_days", "total_cost",
            "status", "created_at",
        ],
        "rows": lambda ServiceOrder: [
            [
                o.id, o.service_offer_id, o.service_request_id,
                o.provider_id, o.specialist_id,
                o.title, o.start_date, o.end_date, o.location,
                o.man_days, o.total_cost,
                o.status, o.created_at
            ]
            for o in ServiceOrder.objects.select_related("service_offer", "service_request", "provider", "specialist").all().order_by("created_at")
        ],
        "dictionary": [],
    },

    # Change Requests
    {
        "file": "service_order_change_requests.csv",
        "table": "procurement.ServiceOrderChangeRequest",
        "columns": [
            "change_request_id", "service_order_id", "provider_id",
            "type", "status",
            "created_by_system", "created_by_user_id", "decided_by_user_id",
            "created_at", "decided_at",
            "reason", "provider_response_note",
            "new_end_date", "additional_man_days", "new_total_cost",
            "old_specialist_user_id", "new_specialist_user_id",
        ],
        "rows": lambda ServiceOrderChangeRequest: [
            [
                cr.id, cr.service_order_id, cr.provider_id,
                cr.type, cr.status,
                cr.created_by_system, cr.created_by_user_id, cr.decided_by_user_id,
                cr.created_at, cr.decided_at,
                cr.reason, cr.provider_response_note,
                cr.new_end_date, cr.additional_man_days, cr.new_total_cost,
                cr.old_specialist_id, cr.new_specialist_id
            ]
            for cr in ServiceOrderChangeRequest.objects.select_related(
                "service_order", "provider", "created_by_user", "decided_by_user"
            ).all().order_by("created_at")
        ],
        "dictionary": [],
    },

    # Activity Logs
    {
        "file": "activity_logs.csv",
        "table": "activitylog.ActivityLog",
        "columns": [
            "activity_log_id", "provider_id", "actor_type", "actor_user_id",
            "event_type", "entity_type", "entity_id",
            "message", "metadata",
            "created_at",
        ],
        "rows": lambda ActivityLog: [
            [
                a.id, a.provider_id, a.actor_type, a.actor_user_id,
                a.event_type, a.entity_type, a.entity_id,
                a.message, json_to_str(a.metadata),
                a.created_at
            ]
            for a in ActivityLog.objects.select_related("provider", "actor_user").all().order_by("created_at")
        ],
        "dictionary": [
            ("metadata", "string", "JSON string (event-dependent)"),
        ],
    },
]


class Command(BaseCommand):
    help = "Export major modules as BI-friendly CSVs (Tableau/Power BI), plus README + data dictionary, optionally zipped."

    def add_arguments(self, parser):
        parser.add_argument("--out", type=str, default="exports/reporting", help="Base output directory.")
        parser.add_argument("--schema-version", type=str, default="v1", help="Schema version label (e.g., v1).")
        parser.add_argument("--zip", action="store_true", help="Create a zip archive of the export folder.")

    def handle(self, *args, **options):
        out_base = Path(options["out"]).resolve()
        schema_version = options["schema_version"]
        do_zip = options["zip"]

        ts = datetime.utcnow().strftime("%Y-%m-%dT%H-%M-%SZ")
        out_dir = out_base / schema_version / ts
        ensure_dir(out_dir)

        self.stdout.write(self.style.WARNING(f"Exporting reporting CSV pack to: {out_dir}"))

        created_files: list[str] = []
        dictionary_entries: list[dict] = []

        # Lazy import models inside handle so Django is fully ready
        from providers.models import Provider
        from accounts.models import User
        from contracts.models import Contract, ContractOffer, ContractAward
        from procurement.models import (
            ServiceRequest, ServiceOffer, ServiceOrder, ServiceOrderChangeRequest
        )
        from activitylog.models import ActivityLog

        model_map = {
            "providers.Provider": Provider,
            "accounts.User": User,
            "contracts.Contract": Contract,
            "contracts.ContractAward": ContractAward,
            "contracts.ContractOffer": ContractOffer,
            "procurement.ServiceRequest": ServiceRequest,
            "procurement.ServiceOffer": ServiceOffer,
            "procurement.ServiceOrder": ServiceOrder,
            "procurement.ServiceOrderChangeRequest": ServiceOrderChangeRequest,
            "activitylog.ActivityLog": ActivityLog,
        }

        for spec in EXPORTS:
            file_name = spec["file"]
            table = spec["table"]
            columns = spec["columns"]
            Model = model_map[table]

            # Build rows
            rows = spec["rows"](Model)

            # Write CSV
            write_csv(out_dir / file_name, columns, rows)
            created_files.append(file_name)

            # Dictionary entries
            for col in columns:
                dictionary_entries.append({
                    "file": file_name,
                    "table": table,
                    "column": col,
                    "type": "mixed",
                    "notes": "",
                })
            for (col, typ, notes) in spec.get("dictionary", []):
                # patch notes for known fields
                for e in dictionary_entries:
                    if e["file"] == file_name and e["column"] == col:
                        e["type"] = typ
                        e["notes"] = notes

            self.stdout.write(self.style.SUCCESS(f"✔ {file_name} ({len(rows)} rows)"))

        # README + data dictionary
        write_readme(out_dir / "README.md", schema_version=schema_version, ts=ts, files=created_files + ["data_dictionary.csv", "README.md"])
        created_files.append("README.md")

        write_data_dictionary(out_dir / "data_dictionary.csv", dictionary_entries)
        created_files.append("data_dictionary.csv")

        # Optional zip
        if do_zip:
            zip_path = out_dir.with_suffix(".zip")  # .../v1/<timestamp>.zip
            zip_folder(out_dir, zip_path)
            self.stdout.write(self.style.SUCCESS(f"📦 Zip created: {zip_path}"))

        self.stdout.write(self.style.SUCCESS("✅ Export completed."))
