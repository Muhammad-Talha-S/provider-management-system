from django.urls import path, include
from . import change_urls
from .views import (
    ServiceRequestListView, ServiceRequestDetailView,
    CreateOfferForServiceRequestView,
    OfferPatchView, OfferWithdrawView,
    OfferListView, MyOffersForRequestView,
    ServiceOrderListView, ServiceOrderDetailView,
    ActivityLogListView,
)

urlpatterns = [
    # service requests
    path("service-requests/", ServiceRequestListView.as_view(), name="service-requests-list"),
    path("service-requests/<uuid:pk>/", ServiceRequestDetailView.as_view(), name="service-requests-detail"),

    # offers (create/edit/withdraw)
    path("service-requests/<uuid:sr_id>/offers/", CreateOfferForServiceRequestView.as_view(), name="offer-create"),
    #path("offers/<uuid:offer_id>/", OfferDetailView.as_view(), name="offer-detail"),
    path("offers/<uuid:offer_id>/edit/", OfferPatchView.as_view(), name="offer-edit"),
    path("offers/<uuid:offer_id>/withdraw/", OfferWithdrawView.as_view(), name="offer-withdraw"),

    # offers (tracking)
    path("offers/", OfferListView.as_view(), name="offers-list"),
    #path("offers/<uuid:pk>/", OfferDetailViewTenantSafe.as_view(), name="offer-detail-tenant-safe"),
    path("service-requests/<uuid:sr_id>/my-offers/", MyOffersForRequestView.as_view(), name="my-offers-for-request"),

    # service orders (view)
    path("service-orders/", ServiceOrderListView.as_view(), name="service-orders-list"),
    path("service-orders/<uuid:pk>/", ServiceOrderDetailView.as_view(), name="service-orders-detail"),

    # activity logs (admin audit)
    path("activity-logs/", ActivityLogListView.as_view(), name="activity-logs-list"),

    path("", include(change_urls.urlpatterns)),
]
