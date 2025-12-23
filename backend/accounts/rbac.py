# accounts/rbac.py
from __future__ import annotations
from django.core.exceptions import PermissionDenied

ROLE_PROVIDER_ADMIN = "Provider Admin"
ROLE_SUPPLIER_REP = "Supplier Representative"
ROLE_CONTRACT_COORDINATOR = "Contract Coordinator"
ROLE_SPECIALIST = "Specialist"


def can_browse_service_requests(user) -> bool:
    return user.has_active_role(ROLE_SUPPLIER_REP) or user.has_active_role(ROLE_PROVIDER_ADMIN)


def can_submit_offer(user) -> bool:
    return user.has_active_role(ROLE_SUPPLIER_REP)


def can_edit_or_withdraw_offer(user) -> bool:
    return user.has_active_role(ROLE_SUPPLIER_REP)


def require_role(user, role_name: str) -> None:
    if not user.has_active_role(role_name):
        raise PermissionDenied(f"Requires role: {role_name}")
