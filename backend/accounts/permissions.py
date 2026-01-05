from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsProviderAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "Provider Admin"
        )


class IsProviderMemberReadOnly(BasePermission):
    """
    Allow any authenticated provider member (Admin/Supplier/Coordinator) to read.
    Specialists should NOT list all users by default (keeps specialist-only view clean).
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        if request.method in SAFE_METHODS:
            return request.user.role in [
                "Provider Admin",
                "Supplier Representative",
                "Contract Coordinator",
            ]

        return False


class IsSameProviderOrSelf(BasePermission):
    """
    Object-level: allow access if:
    - same provider, OR
    - the user is accessing their own record
    """
    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        return obj.provider_id == request.user.provider_id or obj.id == request.user.id
