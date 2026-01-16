from django.urls import path
from .views import (
    ServiceRequestListView,
    ServiceRequestDetailView,
    Group3ServiceRequestCreateView,
    ServiceOfferListCreateView,
    ServiceOfferDetailView,
    ServiceOfferStatusUpdateView,
    ServiceOrderListView,
    ServiceOrderDetailView,
    MyOrdersView,
    ServiceOrderChangeRequestListCreateView,
    ServiceOrderChangeRequestDecisionView,
    Group3CreateExtensionView,
    Group3CreateSubstitutionView,
    Group3OfferDecisionView,
)

urlpatterns = [
    # provider portal
    path("service-requests/", ServiceRequestListView.as_view()),
    path("service-requests/<str:id>/", ServiceRequestDetailView.as_view(), name="service-requests-detail"),

    # group3 api-key: create SR (Milestone 5)
    path("group3/service-requests/", Group3ServiceRequestCreateView.as_view(), name="group3-create-sr"),

    path("service-offers/", ServiceOfferListCreateView.as_view(), name="service-offers-list-create"),
    path("service-offers/<int:id>/", ServiceOfferDetailView.as_view(), name="service-offers-detail"),
    path("service-offers/<int:id>/status/", ServiceOfferStatusUpdateView.as_view(), name="service-offers-status"),

    path("service-orders/", ServiceOrderListView.as_view(), name="service-orders-list"),
    path("service-orders/<int:id>/", ServiceOrderDetailView.as_view(), name="service-orders-detail"),
    path("my-orders/", MyOrdersView.as_view(), name="my-orders"),

    path("service-order-change-requests/", ServiceOrderChangeRequestListCreateView.as_view(), name="order-change-requests"),
    path("service-order-change-requests/<int:id>/decision/", ServiceOrderChangeRequestDecisionView.as_view(), name="order-change-requests-decision"),

    # group3 api-key endpoints
    path("group3/service-orders/<int:id>/extensions/", Group3CreateExtensionView.as_view(), name="group3-create-extension"),
    path("group3/service-orders/<int:id>/substitutions/", Group3CreateSubstitutionView.as_view(), name="group3-create-substitution"),
    path("group3/service-offers/<int:id>/decision/", Group3OfferDecisionView.as_view(), name="group3-offer-decision"),
]
