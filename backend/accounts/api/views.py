from __future__ import annotations

from django.utils import timezone
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.generics import ListAPIView, get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError

from accounts.models import ProviderUser, RoleDefinition, UserRoleAssignment
from .serializers import (
    MeSerializer,
    ProviderUserListSerializer,
    RoleAssignSerializer,
    RoleRevokeSerializer,
)
from .permissions import IsProviderAdmin, ensure_same_provider


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data)


class ProviderUsersListView(ListAPIView):
    """
    Provider Admin: list all users in own provider (tenant boundary enforced).
    """
    permission_classes = [IsAuthenticated, IsProviderAdmin]
    serializer_class = ProviderUserListSerializer

    def get_queryset(self):
        user: ProviderUser = self.request.user
        if not user.provider_id:
            return ProviderUser.objects.none()
        return ProviderUser.objects.filter(provider_id=user.provider_id).order_by("created_at")


class AssignRoleView(APIView):
    """
    Provider Admin: assign role to user (same provider only)
    - Creates ACTIVE UserRoleAssignment (does not delete old assignments)
    """
    permission_classes = [IsAuthenticated, IsProviderAdmin]

    @transaction.atomic
    def post(self, request, user_id):
        actor: ProviderUser = request.user
        target = get_object_or_404(ProviderUser, id=user_id)

        try:
            ensure_same_provider(actor, target)
        except PermissionError as e:
            raise PermissionDenied(str(e))

        serializer = RoleAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        role_name = data["role_name"]
        domain = data.get("domain") or None
        group_name = data.get("group_name") or None

        role_def = get_object_or_404(
            RoleDefinition,
            name=role_name,
            domain=domain,
            group_name=group_name,
        )

        # Optional: avoid duplicate active role if already active
        if target.has_active_role(role_def.name):
            return Response(
                {"detail": f"User already has active role: {role_def.name}"},
                status=status.HTTP_200_OK,
            )

        UserRoleAssignment.objects.create(
            user=target,
            role_definition=role_def,
            experience_level=data.get("experience_level"),
            technology_level=data.get("technology_level"),
            status=UserRoleAssignment.Status.ACTIVE,
            valid_from=timezone.now(),
        )

        return Response(
            {"detail": f"Assigned role '{role_def.name}' to {target.email}"},
            status=status.HTTP_201_CREATED,
        )


class RevokeRoleView(APIView):
    """
    Provider Admin: revoke role from user (same provider only)
    - Sets assignments to REVOKED and valid_to=now (immediate effect)
    """
    permission_classes = [IsAuthenticated, IsProviderAdmin]

    @transaction.atomic
    def post(self, request, user_id):
        actor: ProviderUser = request.user
        target = get_object_or_404(ProviderUser, id=user_id)

        try:
            ensure_same_provider(actor, target)
        except PermissionError as e:
            raise PermissionDenied(str(e))

        serializer = RoleRevokeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        role_name = data["role_name"]
        domain = data.get("domain") or None
        group_name = data.get("group_name") or None

        role_def = get_object_or_404(
            RoleDefinition,
            name=role_name,
            domain=domain,
            group_name=group_name,
        )

        qs = UserRoleAssignment.objects.filter(
            user=target,
            role_definition=role_def,
            status=UserRoleAssignment.Status.ACTIVE,
        )

        if not qs.exists():
            return Response(
                {"detail": "No active assignments found for that role."},
                status=status.HTTP_200_OK,
            )

        now = timezone.now()
        count = 0
        for a in qs:
            a.status = UserRoleAssignment.Status.REVOKED
            a.valid_to = now
            a.save(update_fields=["status", "valid_to"])
            count += 1

        return Response(
            {"detail": f"Revoked role '{role_def.name}' from {target.email} (revoked {count})"},
            status=status.HTTP_200_OK,
        )
