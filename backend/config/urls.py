from django.contrib import admin
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from core import views
# Add this to urlpatterns:
path('api/negotiate-contract/<int:contract_id>/', views.negotiate_contract),
path('api/audit-logs/', views.audit_logs_list),
path('api/external/update-contract/<int:contract_id>/', views.update_contract_status),


urlpatterns = [
    path('api/negotiate-contract/<int:contract_id>/', views.negotiate_contract),
path('api/audit-logs/', views.audit_logs_list),
path('api/external/update-contract/<int:contract_id>/', views.update_contract_status),
# 5. Dashboard & Notifications (The missing pieces!)
    path('api/dashboard-stats/', views.dashboard_stats),
    path('api/notifications/', views.notifications_view),
    path('api/dashboard-stats/', views.dashboard_stats),
    path('api/notifications/', views.notifications_view),
    path('admin/', admin.site.urls),
    path('api/experts/', views.expert_list),
    # Auth
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Application
    path('api/profile/', views.profile_view),
    path('api/audit-logs/', views.audit_logs_list),
    
    # Group 3 Interaction (Requests)
    path('api/service-requests/', views.service_requests_list),
    path('api/submit-offer/<int:request_id>/', views.submit_offer),

    # Group 2 Interaction (Contracts)
    path('api/contracts/', views.contracts_list),
    path('api/contracts/receive/', views.receive_contract_draft),
    path('api/contracts/<int:contract_id>/sign/', views.sign_contract),
path('api/sign-contract/<int:contract_id>/', views.sign_contract), # For the Sign button
    path('api/negotiate-contract/<int:contract_id>/', views.negotiate_contract), # For the Negotiate button
    # Group 5 Interaction (Reporting)
    path('api/reporting/stats/', views.reporting_data),
]