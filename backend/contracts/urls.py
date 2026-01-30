from django.urls import path
from .views import (
    ContractListView,
    ContractDetailView,
    ContractOfferListCreateView,
    Group2SyncContractsView,
    Group2SetProviderStatusView,
    Group2ContractOfferDecisionWebhookView
)

urlpatterns = [
    path("contracts/", ContractListView.as_view(), name="contracts-list"),
    path("contracts/<str:id>/", ContractDetailView.as_view(), name="contracts-detail"),
    path("contracts/<str:id>/offers/", ContractOfferListCreateView.as_view(), name="contract-offers"),

    # Manual pull sync (portal -> Group2)
    path("integrations/group2/sync-contracts/", Group2SyncContractsView.as_view(), name="group2-sync-contracts"),

    # Group2 -> portal provider status updates
    path("group2/contracts/<str:id>/provider-status/", Group2SetProviderStatusView.as_view(), name="group2-provider-status"),
    path(
        "api/integrations/group2/contracts/<str:contract_id>/offer-decision/",
        Group2ContractOfferDecisionWebhookView.as_view(),
        name="group2-contract-offer-decision",
    ),
]
