from django.urls import path
from .views import LoginView, UserRoleUpdateView

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="login"),
    path("users/<str:id>/role/", UserRoleUpdateView.as_view(), name="user-role-update"),
]
