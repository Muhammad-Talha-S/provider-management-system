from rest_framework import serializers
from .models import ServiceRequest


class ServiceRequestSerializer(serializers.ModelSerializer):
    linkedContractId = serializers.CharField(source="linked_contract_id")
    experienceLevel = serializers.CharField(source="experience_level")
    startDate = serializers.DateField(source="start_date")
    endDate = serializers.DateField(source="end_date")
    totalManDays = serializers.IntegerField(source="total_man_days")
    onsiteDays = serializers.IntegerField(source="onsite_days")
    performanceLocation = serializers.CharField(source="performance_location")
    requiredLanguages = serializers.ListField(source="required_languages")
    mustHaveCriteria = serializers.ListField(source="must_have_criteria")
    niceToHaveCriteria = serializers.ListField(source="nice_to_have_criteria")
    taskDescription = serializers.CharField(source="task_description")

    class Meta:
        model = ServiceRequest
        fields = [
            "id",
            "title",
            "type",
            "linkedContractId",
            "role",
            "technology",
            "experienceLevel",
            "startDate",
            "endDate",
            "totalManDays",
            "onsiteDays",
            "performanceLocation",
            "requiredLanguages",
            "mustHaveCriteria",
            "niceToHaveCriteria",
            "taskDescription",
            "status",
        ]
