from django.contrib.auth import authenticate
from rest_framework import serializers, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import UserSerializer, UserRoleUpdateSerializer, UserCreateSerializer, UserUpdateSerializer
from providers.serializers import ProviderSerializer
from .permissions import IsProviderAdmin, IsProviderMemberReadOnly, IsSameProviderOrSelf

from datetime import date
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        user = authenticate(request=request, email=email, password=password)
        if not user:
            return Response({"detail": "Invalid email or password."}, status=status.HTTP_401_UNAUTHORIZED)

        # business status checks (matches your types.ts)
        if user.status != "Active" or not user.is_active:
            return Response({"detail": "User is inactive."}, status=status.HTTP_403_FORBIDDEN)

        if user.provider.status != "Active":
            return Response({"detail": "Provider is inactive."}, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)

        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": UserSerializer(user).data,
            "provider": ProviderSerializer(user.provider).data,
        })


class UserRoleUpdateView(generics.UpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRoleUpdateSerializer
    permission_classes = [IsProviderAdmin]
    lookup_field = "id"

    def patch(self, request, *args, **kwargs):
        target = self.get_object()

        # Multi-provider isolation
        if target.provider_id != request.user.provider_id:
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        # Optional: prevent provider admin from demoting themselves (nice safety)
        if target.id == request.user.id and request.data.get("role") != "Provider Admin":
            return Response({"detail": "You cannot change your own role."}, status=status.HTTP_400_BAD_REQUEST)

        return super().patch(request, *args, **kwargs)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "user": UserSerializer(user).data,
            "provider": ProviderSerializer(user.provider).data
        })

class UserListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = User.objects.filter(provider_id=self.request.user.provider_id).order_by("id")

        # optional filtering
        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)

        return qs

    def get_serializer_class(self):
        if self.request.method == "POST":
            return UserCreateSerializer
        return UserSerializer

    def list(self, request, *args, **kwargs):
        # Specialists should not list all users (specialist-only view)
        if request.user.role == "Specialist":
            raise PermissionDenied("Not allowed.")
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        # Only Provider Admin can create users
        if self.request.user.role != "Provider Admin":
            raise PermissionDenied("Only Provider Admin can create users.")

        # attach provider and default created_at if missing
        created_at = serializer.validated_data.get("created_at") or date.today()
        serializer.save(provider=self.request.user.provider, created_at=created_at)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    lookup_field = "id"
    permission_classes = [IsAuthenticated, IsSameProviderOrSelf]

    def get_serializer_class(self):
        if self.request.method in ["PATCH", "PUT"]:
            return UserUpdateSerializer
        return UserSerializer

    def perform_update(self, serializer):
        target = self.get_object()

        # Provider Admin can edit anyone in provider
        if self.request.user.role == "Provider Admin":
            if target.provider_id != self.request.user.provider_id:
                raise PermissionDenied("Not allowed.")
            serializer.save()
            return

        # Non-admin can only edit self
        if target.id != self.request.user.id:
            raise PermissionDenied("Not allowed.")
        serializer.save()

    def perform_destroy(self, instance):
        # Only Provider Admin can delete, within provider
        if self.request.user.role != "Provider Admin":
            raise PermissionDenied("Only Provider Admin can delete users.")
        if instance.provider_id != self.request.user.provider_id:
            raise PermissionDenied("Not allowed.")
        instance.delete()


class SpecialistListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return User.objects.filter(
            provider_id=self.request.user.provider_id,
            role="Specialist"
        ).order_by("id")

    def list(self, request, *args, **kwargs):
        # Specialist should not list all specialists (keep specialist-only view clean)
        if request.user.role == "Specialist":
            raise PermissionDenied("Not allowed.")
        return super().list(request, *args, **kwargs)
