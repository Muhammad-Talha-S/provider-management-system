from django.urls import path
from .views import ProviderMeView


urlpatterns = [
    path("providers/me/", ProviderMeView.as_view(), name="provider-me"),
]
