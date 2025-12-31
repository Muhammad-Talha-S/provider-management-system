from __future__ import annotations

from django.utils import timezone
from django.db import transaction
from django.db import models
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.generics import ListAPIView, get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError

from accounts.models import ProviderUser, RoleDefinition, UserRoleAssignment, SpecialistProfile
from .serializers import (
    MeSerializer,
    ProviderUserListSerializer,
    RoleAssignSerializer,
    RoleRevokeSerializer,
    MeProfilePatchSerializer,
)
from .permissions import IsProviderAdmin, ensure_same_provider
from procurement.api.utils import log_action


SYSTEM_ROLE_SPECIALIST = "Specialist"


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data)


class MeProfilePatchView(APIView):
    """
    PATCH /api/me/profile/
    Any logged-in user can update own personal profile.
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def patch(self, request):
        user: ProviderUser = request.user
        ser = MeProfilePatchSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        if "full_name" in data:
            user.full_name = data["full_name"]
            user.save(update_fields=["full_name"])

        # Ensure SpecialistProfile exists for everyone (safe even if not Specialist)
        sp, _ = SpecialistProfile.objects.get_or_create(user=user)

        if "performance_grade" in data:
            sp.performance_grade = data["performance_grade"]
        if "avg_daily_rate_eur" in data:
            sp.avg_daily_rate_eur = data["avg_daily_rate_eur"]
        sp.save()

        log_action(
            provider_id=user.provider_id,
            actor_user_id=user.id,
            action="USER_PROFILE_UPDATED",
            entity_type="provider_user",
            entity_id=user.id,
            details=data,
        )

        return Response(MeSerializer(user).data, status=status.HTTP_200_OK)


class MeServiceOrdersView(APIView):
    """
    GET /api/me/service-orders/
    Specialist (employee) can see their own active service orders.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user: ProviderUser = request.user
        from procurement.models import ServiceOrder  # local import to avoid circular

        qs = ServiceOrder.objects.filter(specialist_user=user).order_by("-created_at")
        # optionally filter active only:
        active_only = request.query_params.get("active_only")
        if active_only in {"1", "true", "True"}:
            qs = qs.filter(status="ACTIVE")

        data = [
            {
                "id": str(o.id),
                "title": o.title,
                "status": o.status,
                "start_date": o.start_date,
                "end_date": o.end_date,
                "role_definition_id": str(o.role_definition_id) if o.role_definition_id else None,
                "service_request_id": str(o.service_request_id),
                "provider_id": str(o.provider_id),
            }
            for o in qs
        ]
        return Response(data, status=status.HTTP_200_OK)


class ProviderUsersListView(ListAPIView):
    permission_classes = [IsAuthenticated, IsProviderAdmin]
    serializer_class = ProviderUserListSerializer

    def get_queryset(self):
        user: ProviderUser = self.request.user
        if not user.provider_id:
            return ProviderUser.objects.none()
        return ProviderUser.objects.filter(provider_id=user.provider_id).order_by("created_at")


class AssignRoleView(APIView):
    """
    Provider Admin assigns SYSTEM or JOB role to a user in same provider.
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

        # Avoid duplicate active assignment for same role_def
        now = timezone.now()
        exists = UserRoleAssignment.objects.filter(
            user=target,
            role_definition=role_def,
            status=UserRoleAssignment.Status.ACTIVE,
            valid_from__lte=now,
        ).filter(
            models.Q(valid_to__isnull=True) | models.Q(valid_to__gt=now)
        ).exists()

        if exists:
            return Response({"detail": f"User already has active role: {role_def}"}, status=status.HTTP_200_OK)

        # SYSTEM Specialist should always exist; allow assigning it too if missing
        UserRoleAssignment.objects.create(
            user=target,
            role_definition=role_def,
            experience_level=data.get("experience_level"),
            technology_level=data.get("technology_level"),
            status=UserRoleAssignment.Status.ACTIVE,
            valid_from=timezone.now(),
        )

        log_action(
            provider_id=actor.provider_id,
            actor_user_id=actor.id,
            action="ROLE_ASSIGNED",
            entity_type="provider_user",
            entity_id=target.id,
            details={"role": str(role_def)},
        )

        return Response({"detail": f"Assigned role '{role_def}' to {target.email}"}, status=status.HTTP_201_CREATED)


class RevokeRoleView(APIView):
    """
    Provider Admin revokes a role from user (same provider).
    SPECIALIST (SYSTEM) cannot be revoked. Use deactivate instead.
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

        # Block revoking Specialist SYSTEM role
        if role_def.role_type == RoleDefinition.RoleType.SYSTEM and role_def.name == SYSTEM_ROLE_SPECIALIST:
            raise ValidationError("Specialist role cannot be revoked. Deactivate the user instead.")

        qs = UserRoleAssignment.objects.filter(
            user=target,
            role_definition=role_def,
            status=UserRoleAssignment.Status.ACTIVE,
        )

        if not qs.exists():
            return Response({"detail": "No active assignments found for that role."}, status=status.HTTP_200_OK)

        now = timezone.now()
        count = 0
        for a in qs:
            a.status = UserRoleAssignment.Status.REVOKED
            a.valid_to = now
            a.save(update_fields=["status", "valid_to"])
            count += 1

        log_action(
            provider_id=actor.provider_id,
            actor_user_id=actor.id,
            action="ROLE_REVOKED",
            entity_type="provider_user",
            entity_id=target.id,
            details={"role": str(role_def), "revoked_count": count},
        )

        return Response(
            {"detail": f"Revoked role '{role_def}' from {target.email} (revoked {count})"},
            status=status.HTTP_200_OK,
        )


class ActivateUserView(APIView):
    permission_classes = [IsAuthenticated, IsProviderAdmin]

    @transaction.atomic
    def post(self, request, user_id):
        actor: ProviderUser = request.user
        target = get_object_or_404(ProviderUser, id=user_id)
        try:
            ensure_same_provider(actor, target)
        except PermissionError as e:
            raise PermissionDenied(str(e))

        target.is_active = True
        target.save(update_fields=["is_active"])

        log_action(
            provider_id=actor.provider_id,
            actor_user_id=actor.id,
            action="USER_ACTIVATED",
            entity_type="provider_user",
            entity_id=target.id,
        )
        return Response({"detail": f"User {target.email} activated."}, status=status.HTTP_200_OK)


class DeactivateUserView(APIView):
    permission_classes = [IsAuthenticated, IsProviderAdmin]

    @transaction.atomic
    def post(self, request, user_id):
        actor: ProviderUser = request.user
        target = get_object_or_404(ProviderUser, id=user_id)
        try:
            ensure_same_provider(actor, target)
        except PermissionError as e:
            raise PermissionDenied(str(e))

        # Optionally prevent deactivating yourself (recommended)
        if target.id == actor.id:
            raise ValidationError("You cannot deactivate yourself.")

        target.is_active = False
        target.save(update_fields=["is_active"])

        log_action(
            provider_id=actor.provider_id,
            actor_user_id=actor.id,
            action="USER_DEACTIVATED",
            entity_type="provider_user",
            entity_id=target.id,
        )
        return Response({"detail": f"User {target.email} deactivated."}, status=status.HTTP_200_OK)
