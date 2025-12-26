from django.urls import path
from .views import (
    ServiceRequestListView, ServiceRequestDetailView,
    CreateOfferForServiceRequestView,
    OfferDetailView, OfferPatchView, OfferWithdrawView,
)

urlpatterns = [
    path("service-requests/", ServiceRequestListView.as_view(), name="service-requests-list"),
    path("service-requests/<uuid:pk>/", ServiceRequestDetailView.as_view(), name="service-requests-detail"),

    path("service-requests/<uuid:sr_id>/offers/", CreateOfferForServiceRequestView.as_view(), name="offer-create"),

    path("offers/<uuid:offer_id>/", OfferDetailView.as_view(), name="offer-detail"),
    path("offers/<uuid:offer_id>/edit/", OfferPatchView.as_view(), name="offer-edit"),
    path("offers/<uuid:offer_id>/withdraw/", OfferWithdrawView.as_view(), name="offer-withdraw"),
]
