from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import ActivityLog
from .serializers import ActivityLogSerializer
from .permissions import IsProviderAdmin

class ActivityLogListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsProviderAdmin]
    serializer_class = ActivityLogSerializer

    def get_queryset(self):
        return ActivityLog.objects.filter(provider_id=self.request.user.provider_id)
