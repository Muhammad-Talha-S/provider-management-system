from __future__ import annotations
from rest_framework.permissions import BasePermission

ROLE_PROVIDER_ADMIN = "Provider Admin"
ROLE_SUPPLIER_REP = "Supplier Representative"


class IsProviderAdminOnly(BasePermission):
    def has_permission(self, request, view) -> bool:
        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated and user.has_active_role(ROLE_PROVIDER_ADMIN))


class IsProviderAdminOrSupplierRep(BasePermission):
    def has_permission(self, request, view) -> bool:
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return user.has_active_role(ROLE_PROVIDER_ADMIN) or user.has_active_role(ROLE_SUPPLIER_REP)


class IsProviderAdminOrSupplierRepForWrite(BasePermission):
    """
    For offer creation/edit/withdraw.
    Since Provider Admin has all privileges, allow Provider Admin too.
    """
    def has_permission(self, request, view) -> bool:
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return user.has_active_role(ROLE_PROVIDER_ADMIN) or user.has_active_role(ROLE_SUPPLIER_REP)
