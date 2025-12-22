from rest_framework import serializers
# 1. Import ALL your models here at the top (Only need this once)
from .models import Profile, ServiceRequest, Contract, Expert, AuditLog
from .models import Notification # <--- Add this import
class ProfileSerializer(serializers.ModelSerializer):
    # Mapping Python names (snake_case) to React names (camelCase)
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

class ExpertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expert
        fields = '__all__'

# --- FIX: Move this class all the way to the left (Un-indent) ---
class AuditLogSerializer(serializers.ModelSerializer):
    timestamp = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S")
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'username', 'action', 'details', 'timestamp']
        
        
class NotificationSerializer(serializers.ModelSerializer):
    timestamp = serializers.DateTimeField(format="%H:%M %d-%m")
    
    class Meta:
        model = Notification
        fields = ['id', 'message', 'is_read', 'timestamp']