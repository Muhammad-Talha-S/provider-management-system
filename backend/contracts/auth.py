from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings


class Group2ApiKeyAuthentication(BaseAuthentication):
    """
    API-key auth for Group2 system calls.
    Client sends: X-API-Key: <key>
    """
    header_name = "HTTP_X_API_KEY"

    def authenticate(self, request):
        expected = getattr(settings, "GROUP2_API_KEY", None)
        if not expected:
            raise AuthenticationFailed("Server missing GROUP2_API_KEY setting.")

        provided = request.META.get(self.header_name)
        if not provided or provided != expected:
            raise AuthenticationFailed("Invalid or missing API key.")

        # Return (None, 'apikey') since this is system auth
        return (None, "apikey")
