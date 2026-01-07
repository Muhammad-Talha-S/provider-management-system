from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    MeView, LoginView, UserRoleUpdateView,
    UserListCreateView, UserDetailView, SpecialistListView
)

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("users/", UserListCreateView.as_view(), name="users-list-create"),
    path("users/<str:id>/", UserDetailView.as_view(), name="users-detail"),
    path("users/<str:id>/role/", UserRoleUpdateView.as_view(), name="user-role-update"),
    path("specialists/", SpecialistListView.as_view(), name="specialists-list"),
]
