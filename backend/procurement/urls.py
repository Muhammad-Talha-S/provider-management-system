from django.urls import path
from .views import (
    ServiceRequestListView,
    ServiceRequestDetailView,
    ServiceOfferListCreateView,
    ServiceOfferDetailView,
    ServiceOfferStatusUpdateView,
    ServiceOfferDecisionView,
    ServiceOrderListView,
    ServiceOrderDetailView,
    ServiceOrderSubstitutionView,
    ServiceOrderExtensionView,
)

urlpatterns = [
    path("service-requests/", ServiceRequestListView.as_view()),
    path("service-requests/<str:id>/", ServiceRequestDetailView.as_view(), name="service-requests-detail"),

    path("service-offers/", ServiceOfferListCreateView.as_view(), name="service-offers-list-create"),
    path("service-offers/<int:id>/", ServiceOfferDetailView.as_view(), name="service-offers-detail"),
    path("service-offers/<int:id>/status/", ServiceOfferStatusUpdateView.as_view(), name="service-offers-status"),
    path("service-offers/<int:id>/decision/", ServiceOfferDecisionView.as_view(), name="service-offers-decision"),

    path("service-orders/", ServiceOrderListView.as_view(), name="service-orders-list"),
    path("service-orders/<int:id>/", ServiceOrderDetailView.as_view(), name="service-orders-detail"),
    path("service-orders/<int:id>/substitution/", ServiceOrderSubstitutionView.as_view(), name="service-orders-substitution"),
    path("service-orders/<int:id>/extension/", ServiceOrderExtensionView.as_view(), name="service-orders-extension"),
]
