from rest_framework.permissions import BasePermission


class CanViewContracts(BasePermission):
    """
    Everyone authenticated can view published/active etc.
    """
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated)


class CanSubmitContractOffer(BasePermission):
    """
    Provider Admin + Supplier Representative + Contract Coordinator can submit offers.
    Specialists are read-only.
    """
    allowed_roles = ["Provider Admin", "Supplier Representative", "Contract Coordinator"]

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return getattr(user, "role", None) in self.allowed_roles
