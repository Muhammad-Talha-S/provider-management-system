from django.contrib.auth import authenticate
from rest_framework import serializers, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import UserSerializer, UserRoleUpdateSerializer
from providers.serializers import ProviderSerializer
from .permissions import IsProviderAdmin


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