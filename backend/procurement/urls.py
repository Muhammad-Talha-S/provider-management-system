from django.urls import path
from .views import (
    ServiceRequestListView,
    ServiceRequestDetailView,
    Group3SyncServiceRequestsView,
    ServiceOfferListCreateView,
    ServiceOfferDetailView,
    ServiceOrderListView,
    ServiceOrderDetailView,
    Group3OfferDecisionWebhookView,
    SuggestedSpecialistsView,
    ServiceOrderChangeRequestListCreateView,
    ServiceOrderChangeRequestDecisionView,
    Group3InboundExtensionCreateView,
    Group3InboundSubstitutionCreateView,
)

urlpatterns = [
    # Service Requests
    path("service-requests/", ServiceRequestListView.as_view(), name="service-requests"),
    path("service-requests/<str:id>/", ServiceRequestDetailView.as_view(), name="service-request-detail"),

    # Group3 sync
    path("integrations/group3/sync-service-requests/", Group3SyncServiceRequestsView.as_view(), name="group3-sync"),

    # Service Offers
    path("service-offers/", ServiceOfferListCreateView.as_view(), name="service-offers"),
    path("service-offers/<int:id>/", ServiceOfferDetailView.as_view(), name="service-offer-detail"),

    # Group3 → offer decision callback (SECURED)
    path(
        "integrations/group3/offers/<int:offer_id>/decision/",
        Group3OfferDecisionWebhookView.as_view(),
        name="group3-offer-decision-webhook",
    ),

    # Suggested specialists
    path(
        "service-requests/<str:pk>/suggested-specialists/",
        SuggestedSpecialistsView.as_view(),
        name="service-request-suggested-specialists",
    ),

    # Service Orders
    path("service-orders/", ServiceOrderListView.as_view(), name="service-orders"),
    path("service-orders/<int:id>/", ServiceOrderDetailView.as_view(), name="service-order-detail"),

    # Change Requests (UI)
    path("service-order-change-requests/", ServiceOrderChangeRequestListCreateView.as_view(), name="service-order-change-requests"),
    path("service-order-change-requests/<int:id>/decision/", ServiceOrderChangeRequestDecisionView.as_view(), name="service-order-change-request-decision"),

    # INBOUND from Group3 (SECURED)
    path("integrations/group3/order-changes/extension/", Group3InboundExtensionCreateView.as_view(), name="group3-inbound-extension"),
    path("integrations/group3/order-changes/substitution/", Group3InboundSubstitutionCreateView.as_view(), name="group3-inbound-substitution"),
]
