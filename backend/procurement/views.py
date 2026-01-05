from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from accounts.permissions import IsProviderAdmin  # you already have this
from .models import ServiceRequest
from .serializers import ServiceRequestSerializer
from .permissions import NotContractCoordinator


class ServiceRequestListView(APIView):
    permission_classes = [IsAuthenticated, NotContractCoordinator]

    def get(self, request, *args, **kwargs):
        # Default: show Open and Closed; use ?status=Open to filter
        status_param = request.query_params.get("status")
        qs = ServiceRequest.objects.all().order_by("-created_at")

        if status_param and status_param != "all":
            qs = qs.filter(status=status_param)

        data = ServiceRequestSerializer(qs, many=True).data
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        # Optional: allow Provider Admin to create via Postman
        if getattr(request.user, "role", None) != "Provider Admin":
            return Response({"detail": "Only Provider Admin can create service requests (local demo)."}, status=403)

        ser = ServiceRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        # Convert serializer camelCase -> model fields manually
        v = ser.validated_data
        obj = ServiceRequest.objects.create(
            id=v["id"],
            title=v["title"],
            type=v["type"],
            linked_contract_id=v["linked_contract_id"],
            role=v["role"],
            technology=v.get("technology", ""),
            experience_level=v["experience_level"],
            start_date=v["start_date"],
            end_date=v["end_date"],
            total_man_days=v.get("total_man_days", 0),
            onsite_days=v.get("onsite_days", 0),
            performance_location=v["performance_location"],
            required_languages=v.get("required_languages", []),
            must_have_criteria=v.get("must_have_criteria", []),
            nice_to_have_criteria=v.get("nice_to_have_criteria", []),
            task_description=v.get("task_description", ""),
            status=v.get("status", "Open"),
        )

        return Response(ServiceRequestSerializer(obj).data, status=status.HTTP_201_CREATED)


class ServiceRequestDetailView(APIView):
    permission_classes = [IsAuthenticated, NotContractCoordinator]

    def get(self, request, id: str, *args, **kwargs):
        try:
            obj = ServiceRequest.objects.get(id=id)
        except ServiceRequest.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(ServiceRequestSerializer(obj).data, status=status.HTTP_200_OK)
