from django.urls import path
from .views import ProviderMeView, ProviderMeUpdateView

urlpatterns = [
    path("providers/me/", ProviderMeView.as_view(), name="provider_me"),
    path("providers/me/update/", ProviderMeUpdateView.as_view(), name="provider_me_update"),
]
