from django.urls import path
from .views import MeView, ProviderUsersListView, AssignRoleView, RevokeRoleView

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("users/", ProviderUsersListView.as_view(), name="provider-users"),
    path("users/<uuid:user_id>/roles/assign/", AssignRoleView.as_view(), name="assign-role"),
    path("users/<uuid:user_id>/roles/revoke/", RevokeRoleView.as_view(), name="revoke-role"),
]
