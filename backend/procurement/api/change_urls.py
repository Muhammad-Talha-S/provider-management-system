from django.urls import path
from .change_views import (
    ServiceOrderChangeRequestListView,
    SupplierInitiateSubstitutionView,
    SupplierDecideOnPMChangeRequestView,
    PMCreateExtensionView,
    PMDecideOnSupplierSubstitutionView,
)

urlpatterns = [
    # provider side
    path("service-orders/<uuid:order_id>/change-requests/", ServiceOrderChangeRequestListView.as_view()),
    path("service-orders/<uuid:order_id>/change-requests/substitution/", SupplierInitiateSubstitutionView.as_view()),
    path("change-requests/<uuid:cr_id>/<str:decision>/", SupplierDecideOnPMChangeRequestView.as_view()),  # accept/reject

    # PM stub (testing only)
    path("pm/service-orders/<uuid:order_id>/extensions/", PMCreateExtensionView.as_view()),
    path("pm/change-requests/<uuid:cr_id>/<str:decision>/", PMDecideOnSupplierSubstitutionView.as_view()),  # accept/reject
]
