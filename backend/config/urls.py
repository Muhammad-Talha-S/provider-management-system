from django.contrib import admin
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from core import views

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Auth
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Application
    path('api/profile/', views.profile_view),
    
    # Group 3 Interaction (Requests)
    path('api/service-requests/', views.service_requests_list),
    path('api/submit-offer/<int:request_id>/', views.submit_offer),

    # Group 2 Interaction (Contracts)
    path('api/contracts/', views.contracts_list),
    path('api/contracts/receive/', views.receive_contract_draft),
    path('api/contracts/<int:contract_id>/sign/', views.sign_contract),

    # Group 5 Interaction (Reporting)
    path('api/reporting/stats/', views.reporting_data),
]