from django.urls import path
from .views import ServiceRequestListView, ServiceRequestDetailView

urlpatterns = [
    path("service-requests/", ServiceRequestListView.as_view(), name="service-requests"),
    path("service-requests/<str:id>/", ServiceRequestDetailView.as_view(), name="service-request-detail"),
]
