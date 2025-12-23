from django.contrib import admin
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from accounts.views import EmailTokenObtainPairView

urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/token/", EmailTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
