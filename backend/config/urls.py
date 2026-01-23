from django.contrib import admin
from django.urls import path, include, re_path
from django.http import FileResponse
from django.conf import settings
from pathlib import Path


def spa_index(request):
    """
    Serve React index.html for all non-API routes
    """
    index_path = Path(settings.BASE_DIR) / "static" / "index.html"
    return FileResponse(open(index_path, "rb"))


urlpatterns = [
    path("admin/", admin.site.urls),

    # API routes
    path("api/", include("accounts.urls")),
    path("api/", include("providers.urls")),
    path("api/", include("procurement.urls")),
    path("api/", include("activitylog.urls")),
    path("api/", include("contracts.urls")),
]

# Catch-all route for React (must be LAST)
urlpatterns += [
    re_path(r"^(?!api/).*", spa_index),
]
