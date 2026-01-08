from rest_framework.permissions import BasePermission


class NotContractCoordinator(BasePermission):
    """
    Deny access to Contract Coordinator for Service Requests.
    Allowed: Provider Admin, Supplier Representative, Specialist (optional), etc.
    """
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return getattr(user, "role", None) != "Contract Coordinator"
