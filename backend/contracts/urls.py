from django.urls import path
from .views import ContractListView, ContractDetailView, ContractOfferListCreateView, Group2ContractAwardView

urlpatterns = [
    path("contracts/", ContractListView.as_view(), name="contracts-list"),
    path("contracts/<str:id>/", ContractDetailView.as_view(), name="contracts-detail"),
    path("contracts/<str:id>/offers/", ContractOfferListCreateView.as_view(), name="contracts-offers"),
    path("group2/contracts/<str:id>/award/", Group2ContractAwardView.as_view(), name="group2-contract-award"),
]
