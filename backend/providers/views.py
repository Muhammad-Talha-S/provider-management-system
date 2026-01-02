from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .serializers import ProviderSerializer, ProviderUpdateSerializer
from accounts.permissions import IsProviderAdmin

class ProviderMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(ProviderSerializer(request.user.provider).data)

class ProviderMeUpdateView(APIView):
    permission_classes = [IsProviderAdmin]

    def patch(self, request):
        provider = request.user.provider
        ser = ProviderUpdateSerializer(provider, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        provider = ser.save()
        return Response(ProviderSerializer(provider).data, status=status.HTTP_200_OK)
