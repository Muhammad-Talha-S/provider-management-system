from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .serializers import ProviderSerializer, ProviderUpdateSerializer
from activitylog.utils import log_activity


class ProviderMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response(
            ProviderSerializer(request.user.provider).data,
            status=status.HTTP_200_OK
        )

    def patch(self, request, *args, **kwargs):
        # Provider Admin only
        if getattr(request.user, "role", None) != "Provider Admin":
            return Response(
                {"detail": "Only Provider Admin can update provider details."},
                status=status.HTTP_403_FORBIDDEN
            )

        provider = request.user.provider
        ser = ProviderUpdateSerializer(provider, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        provider = ser.save()
        log_activity(
            provider_id=request.user.provider_id,
            actor_type="USER",
            actor_user=request.user,
            event_type="PROV_PROVIDER_UPDATED",
            entity_type="Provider",
            entity_id=provider.id,
            message="Updated provider profile/settings",
        )

        return Response(
            ProviderSerializer(provider).data,
            status=status.HTTP_200_OK
        )
