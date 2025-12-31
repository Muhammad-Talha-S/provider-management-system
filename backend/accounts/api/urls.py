from django.urls import path
from .views import (
    MeView,
    MeProfilePatchView,
    MeServiceOrdersView,
    ProviderUsersListView,
    AssignRoleView,
    RevokeRoleView,
    ActivateUserView,
    DeactivateUserView,
)

urlpatterns = [
    path("me/", MeView.as_view()),
    path("me/profile/", MeProfilePatchView.as_view()),
    path("me/service-orders/", MeServiceOrdersView.as_view()),

    path("users/", ProviderUsersListView.as_view()),
    path("users/<uuid:user_id>/roles/assign/", AssignRoleView.as_view()),
    path("users/<uuid:user_id>/roles/revoke/", RevokeRoleView.as_view()),

    path("users/<uuid:user_id>/activate/", ActivateUserView.as_view()),
    path("users/<uuid:user_id>/deactivate/", DeactivateUserView.as_view()),
]
