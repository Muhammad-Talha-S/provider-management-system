from __future__ import annotations

from decimal import Decimal
from rest_framework import serializers

from procurement.models import (
    ServiceRequest, ServiceRequestRequirement, ServiceRequestLanguage,
    ServiceOffer, ServiceOfferMatchDetail, ServiceOrder, ActivityLog
)
from providers.models import Specialist, SpecialistRoleCapability
from accounts.models import RoleRatePolicy, UserRoleAssignment


class ServiceRequestRequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequestRequirement
        fields = ["id", "type", "skill_name", "weight_pct"]


class ServiceRequestLanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequestLanguage
        fields = ["id", "language", "skill_level"]


class ServiceRequestListSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRequest
        fields = [
            "id", "title", "status", "request_type",
            "start_date", "end_date",
            "domain_name", "technology", "experience_level",
            "sum_man_days", "onsite_days", "performance_location",
            "role",
            "created_at",
        ]

    def get_role(self, obj: ServiceRequest):
        if not obj.role_definition:
            return None
        return {
            "id": obj.role_definition.id,
            "name": obj.role_definition.name,
            "domain": obj.role_definition.domain,
            "group_name": obj.role_definition.group_name,
        }


class ServiceRequestDetailSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    requirements = ServiceRequestRequirementSerializer(many=True, read_only=True)
    languages = ServiceRequestLanguageSerializer(many=True, read_only=True)
    contract = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRequest
        fields = [
            "id", "title", "status", "request_type",
            "contract",
            "requested_by_external_id",
            "start_date", "end_date",
            "domain_name", "technology", "experience_level",
            "sum_man_days", "onsite_days", "performance_location",
            "task_description",
            "role",
            "requirements",
            "languages",
            "created_at", "updated_at",
        ]

    def get_role(self, obj: ServiceRequest):
        if not obj.role_definition:
            return None
        return {
            "id": obj.role_definition.id,
            "name": obj.role_definition.name,
            "domain": obj.role_definition.domain,
            "group_name": obj.role_definition.group_name,
        }

    def get_contract(self, obj: ServiceRequest):
        c = obj.contract
        return {"id": c.id, "title": c.title, "status": c.status}


class ServiceOfferSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceOffer
        fields = [
            "id",
            "service_request",
            "provider",
            "submitted_by_user",
            "specialist",
            "daily_rate_eur",
            "travel_cost_per_onsite_day_eur",
            "total_cost_eur",
            "contractual_relationship",
            "subcontractor_company_name",
            "status",
            "match_score",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id", "service_request", "provider", "submitted_by_user",
            "total_cost_eur", "match_score", "created_at", "updated_at",
        ]


class OfferCreateSerializer(serializers.Serializer):
    specialist_id = serializers.UUIDField()
    daily_rate_eur = serializers.DecimalField(max_digits=10, decimal_places=2)
    travel_cost_per_onsite_day_eur = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=Decimal("0.00"))
    contractual_relationship = serializers.ChoiceField(choices=["EMPLOYEE", "FREELANCER", "SUBCONTRACTOR"])
    subcontractor_company_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    # optional manual override if specialist capability not present
    experience_level = serializers.ChoiceField(
        choices=UserRoleAssignment.ExperienceLevel.choices, required=False, allow_null=True
    )
    technology_level = serializers.ChoiceField(
        choices=UserRoleAssignment.TechnologyLevel.choices, required=False, allow_null=True
    )


class OfferPatchSerializer(serializers.Serializer):
    # allow editing values
    specialist_id = serializers.UUIDField(required=False)
    daily_rate_eur = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    travel_cost_per_onsite_day_eur = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    contractual_relationship = serializers.ChoiceField(choices=["EMPLOYEE", "FREELANCER", "SUBCONTRACTOR"], required=False)
    subcontractor_company_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)


def compute_total_cost(sr: ServiceRequest, daily_rate: Decimal, travel_per_day: Decimal) -> Decimal:
    man_days = Decimal(str(sr.sum_man_days or 0))
    onsite_days = Decimal(str(sr.onsite_days or 0))
    return (daily_rate * man_days) + (travel_per_day * onsite_days)


def pick_levels_for_policy(sr: ServiceRequest, specialist: Specialist, payload: dict):
    """
    Prefer SpecialistRoleCapability for (specialist + sr.role_definition).
    Fallback to payload provided levels.
    """
    if sr.role_definition_id:
        cap = SpecialistRoleCapability.objects.filter(
            specialist=specialist,
            role_definition_id=sr.role_definition_id,
        ).first()
        if cap:
            return cap.experience_level, cap.technology_level

    exp = payload.get("experience_level")
    tech = payload.get("technology_level")
    return exp, tech


def validate_rate_policy(sr: ServiceRequest, daily_rate: Decimal, exp_level: str | None, tech_level: str | None):
    if not sr.role_definition_id:
        # no role specified -> cannot check policy properly
        raise serializers.ValidationError("Service request has no role_definition; cannot validate rate policy.")

    if not exp_level or not tech_level:
        raise serializers.ValidationError(
            "Cannot determine experience_level/technology_level for rate policy. "
            "Add SpecialistRoleCapability or pass experience_level + technology_level in request."
        )

    policy = RoleRatePolicy.objects.filter(
        role_definition_id=sr.role_definition_id,
        experience_level=exp_level,
        technology_level=tech_level,
    ).first()

    if not policy:
        raise serializers.ValidationError(
            f"No RoleRatePolicy configured for role={sr.role_definition.name} exp={exp_level} tech={tech_level}."
        )

    if daily_rate > policy.max_daily_rate_eur:
        raise serializers.ValidationError(
            f"daily_rate_eur {daily_rate} exceeds max {policy.max_daily_rate_eur} for "
            f"{sr.role_definition.name} ({exp_level}/{tech_level})."
        )


class OfferListSerializer(serializers.ModelSerializer):
    service_request_title = serializers.CharField(source="service_request.title", read_only=True)
    specialist_name = serializers.CharField(source="specialist.full_name", read_only=True)
    submitted_by_name = serializers.CharField(source="submitted_by_user.full_name", read_only=True)
    submitted_by_email = serializers.CharField(source="submitted_by_user.email", read_only=True)

    class Meta:
        model = ServiceOffer
        fields = [
            "id",
            "service_request",
            "service_request_title",
            "provider",
            "submitted_by_user",
            "submitted_by_name",
            "submitted_by_email",
            "specialist",
            "specialist_name",
            "daily_rate_eur",
            "travel_cost_per_onsite_day_eur",
            "total_cost_eur",
            "contractual_relationship",
            "subcontractor_company_name",
            "status",
            "match_score",
            "created_at",
            "updated_at",
        ]


class ServiceOrderListSerializer(serializers.ModelSerializer):
    service_request_title = serializers.CharField(source="service_request.title", read_only=True)
    specialist_name = serializers.CharField(source="specialist.full_name", read_only=True)
    supplier_rep_name = serializers.CharField(source="supplier_representative_user.full_name", read_only=True)

    class Meta:
        model = ServiceOrder
        fields = [
            "id",
            "title",
            "status",
            "service_request",
            "service_request_title",
            "provider",
            "supplier_representative_user",
            "supplier_rep_name",
            "specialist",
            "specialist_name",
            "role_definition",
            "start_date",
            "end_date",
            "location",
            "man_days",
            "created_at",
            "updated_at",
        ]


class ServiceOrderDetailSerializer(serializers.ModelSerializer):
    service_request_title = serializers.CharField(source="service_request.title", read_only=True)
    specialist_name = serializers.CharField(source="specialist.full_name", read_only=True)
    supplier_rep_name = serializers.CharField(source="supplier_representative_user.full_name", read_only=True)
    accepted_offer_id = serializers.UUIDField(source="accepted_offer.id", read_only=True)

    class Meta:
        model = ServiceOrder
        fields = [
            "id",
            "title",
            "status",
            "service_request",
            "service_request_title",
            "accepted_offer_id",
            "provider",
            "supplier_representative_user",
            "supplier_rep_name",
            "specialist",
            "specialist_name",
            "role_definition",
            "start_date",
            "end_date",
            "location",
            "man_days",
            "created_at",
            "updated_at",
        ]


class ActivityLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor_user.full_name", read_only=True)
    actor_email = serializers.CharField(source="actor_user.email", read_only=True)
    provider_name = serializers.CharField(source="provider.name", read_only=True)

    class Meta:
        model = ActivityLog
        fields = [
            "id",
            "provider",
            "provider_name",
            "actor_user",
            "actor_name",
            "actor_email",
            "action",
            "entity_type",
            "entity_id",
            "details",
            "created_at",
        ]
