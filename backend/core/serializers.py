from rest_framework import serializers
from .models import Profile, ServiceRequest, Contract

class ProfileSerializer(serializers.ModelSerializer):
    # Mapping Python names to React names
    companyName = serializers.CharField(source='company_name')
    taxId = serializers.CharField(source='tax_id')
    contactEmail = serializers.EmailField(source='contact_email')

    class Meta:
        model = Profile
        fields = ['companyName', 'address', 'taxId', 'contactEmail']

class ServiceRequestSerializer(serializers.ModelSerializer):
    start_date = serializers.DateField(format="%Y-%m-%d") # Ensure date format matches

    class Meta:
        model = ServiceRequest
        fields = ['id', 'role', 'skill', 'duration', 'start_date', 'status']

class ContractSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contract
        fields = ['id', 'title', 'client_name', 'date', 'status']