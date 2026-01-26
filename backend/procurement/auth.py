from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings


class Group3ApiKeyAuthentication(BaseAuthentication):
    """
    API-key auth for inbound calls FROM Group 3 to our system.

    Group 3 sends:
      ServiceRequestbids3a: <API_KEY>

    We validate against settings.GROUP3_CONNECTION_API_KEY.
    """

    def authenticate(self, request):
        expected = getattr(settings, "GROUP3_CONNECTION_API_KEY", None)
        if not expected:
            raise AuthenticationFailed("Server missing GROUP3_CONNECTION_API_KEY setting.")

        header_name = "GROUP3-API-KEY"
        meta_key = "HTTP_" + header_name.upper().replace("-", "_")
        provided = request.META.get(meta_key)

        if not provided or provided != expected:
            raise AuthenticationFailed("Invalid or missing API key.")

        # Return a pseudo auth tuple (no user)
        return (None, "group3-apikey")

