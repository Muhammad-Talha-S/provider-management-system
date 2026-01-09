from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings


class Group3ApiKeyAuthentication(BaseAuthentication):
    """
    Simple API-key auth for Group 3 system calls.
    Client sends:  X-API-Key: <key>
    """
    header_name = "HTTP_X_API_KEY"

    def authenticate(self, request):
        expected = getattr(settings, "GROUP3_API_KEY", None)
        if not expected:
            raise AuthenticationFailed("Server missing GROUP3_API_KEY setting.")

        provided = request.META.get(self.header_name)
        if not provided or provided != expected:
            raise AuthenticationFailed("Invalid or missing API key.")

        # DRF expects (user, auth). We don't have a user. Return (None, 'apikey').
        return (None, "apikey")
