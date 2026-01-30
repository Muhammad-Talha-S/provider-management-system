from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple


class ContractValidationError(ValueError):
    pass


def _norm(s: Any) -> str:
    return str(s or "").strip()


def normalize_sr_type(sr_type: str) -> str:
    sr_type = _norm(sr_type).upper()
    mapping = {
        "SINGLE": "SINGLE",
        "MULTI": "MULTI",
        "TEAM": "TEAM",
        "WORK_CONTRACT": "WORK_CONTRACT",
    }
    return mapping.get(sr_type, sr_type)


def normalize_experience(level: str) -> str:
    """
    Contract expects: Junior / Intermediate / Senior
    Group3 might send Mid, etc.
    """
    v = _norm(level)
    if v.lower() == "mid":
        return "Intermediate"
    if v.lower() == "intermediate":
        return "Intermediate"
    if v.lower() == "junior":
        return "Junior"
    if v.lower() == "senior":
        return "Senior"
    return v


def normalize_tech_level(level: str) -> str:
    """
    Our standard: Common / Uncommon / Rare
    If Group2 sends Basic/Intermediate/Advanced/Expert, we keep as-is in external snapshot,
    but for contract-driven validation we compare as strings, so the contract config must match.
    """
    v = _norm(level)
    if v.lower() == "common":
        return "Common"
    if v.lower() == "uncommon":
        return "Uncommon"
    if v.lower() == "rare":
        return "Rare"
    return v


def _list_str(v: Any) -> List[str]:
    if not isinstance(v, list):
        return []
    return [str(x).strip() for x in v if str(x).strip()]


def get_accepted_types(cfg: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """
    cfg is contract.config (Group2.allowedConfiguration)
    acceptedServiceRequestTypes is:
      [{type,isAccepted,biddingDeadlineDays,offerCycles},...]
    """
    out: Dict[str, Dict[str, Any]] = {}
    arr = cfg.get("acceptedServiceRequestTypes") or []
    if not isinstance(arr, list):
        return out
    for item in arr:
        if not isinstance(item, dict):
            continue
        t = normalize_sr_type(item.get("type"))
        out[t] = item
    return out


def validate_sr_against_contract(
    *,
    contract_config: Optional[Dict[str, Any]],
    sr_type: str,
    roles: List[Dict[str, Any]],
    must_have: List[Any],
    nice_to_have: List[Any],
) -> Tuple[int, int]:
    """
    Returns (biddingDeadlineDays, offerCycles).
    """
    if not isinstance(contract_config, dict):
        raise ContractValidationError("Contract allowedConfiguration is missing.")

    accepted_map = get_accepted_types(contract_config)
    sr_type = normalize_sr_type(sr_type)

    if sr_type not in accepted_map or not bool(accepted_map[sr_type].get("isAccepted", True)):
        raise ContractValidationError(f"Service request type '{sr_type}' is not accepted by the contract.")

    # Limits
    if len(must_have) > 3:
        raise ContractValidationError("Must-have criteria cannot exceed 3.")
    if len(nice_to_have) > 5:
        raise ContractValidationError("Nice-to-have criteria cannot exceed 5.")

    # Optional domain/role checks using roles[]
    allowed_domains = _list_str(contract_config.get("domains"))
    allowed_roles = _list_str(contract_config.get("roles"))
    allowed_exps = _list_str(contract_config.get("experienceLevels"))
    allowed_tech = _list_str(contract_config.get("technologyLevels"))

    for r in roles or []:
        if not isinstance(r, dict):
            continue
        dom = _norm(r.get("domain"))
        role_name = _norm(r.get("roleName"))
        exp = normalize_experience(r.get("experienceLevel"))
        tech = _norm(r.get("technology"))

        '''
        if allowed_domains and dom and dom not in allowed_domains:
            raise ContractValidationError(f"Domain '{dom}' not allowed by contract.")
        if allowed_roles and role_name and role_name not in allowed_roles:
            raise ContractValidationError(f"Role '{role_name}' not allowed by contract.")
        if allowed_exps and exp and exp not in allowed_exps:
            raise ContractValidationError(f"Experience level '{exp}' not allowed by contract.")
        '''

    deadline_days = int(accepted_map[sr_type].get("biddingDeadlineDays") or 0)
    cycles = int(accepted_map[sr_type].get("offerCycles") or 1)
    if cycles not in (1, 2):
        cycles = 1

    return max(deadline_days, 0), cycles


def find_max_daily_rate(
    *,
    contract_config: Dict[str, Any],
    role: str,
    experience_level: str,
    technology_level: str,
) -> Optional[float]:
    pr = contract_config.get("pricingRules") or {}
    if not isinstance(pr, dict):
        return None
    matrix = pr.get("maxDailyRates") or []
    if not isinstance(matrix, list):
        return None

    role = _norm(role)
    experience_level = normalize_experience(experience_level)
    technology_level = _norm(technology_level)

    for row in matrix:
        if not isinstance(row, dict):
            continue
        if _norm(row.get("role")) == role and normalize_experience(row.get("experienceLevel")) == experience_level and _norm(row.get("technologyLevel")) == technology_level:
            try:
                return float(row.get("maxDailyRate"))
            except Exception:
                return None
    return None
