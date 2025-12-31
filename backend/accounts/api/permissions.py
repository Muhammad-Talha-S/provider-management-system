from __future__ import annotations

from rest_framework.permissions import BasePermission
from accounts.models import ProviderUser

ROLE_PROVIDER_ADMIN = "Provider Admin"


class IsAuthenticatedTenantUser(BasePermission):
    def has_permission(self, request, view) -> bool:
        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated)


class IsProviderAdmin(BasePermission):
    def has_permission(self, request, view) -> bool:
        user: ProviderUser = request.user
        return bool(user and user.is_authenticated and user.has_system_role(ROLE_PROVIDER_ADMIN))


def ensure_same_provider(actor: ProviderUser, target: ProviderUser) -> None:
    if not actor.provider_id or not target.provider_id:
        raise PermissionError("Tenant boundary missing (provider not set).")
    if actor.provider_id != target.provider_id:
        raise PermissionError("Cannot manage users outside your provider.")
