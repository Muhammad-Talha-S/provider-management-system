from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.contrib.auth.models import User

# Import ALL your models (including the new Notification)
from .models import Profile, ServiceRequest, Contract, Expert, AuditLog, Notification

# Import ALL your serializers (including the new NotificationSerializer)
from .serializers import (
    ProfileSerializer, 
    ServiceRequestSerializer, 
    ContractSerializer, 
    ExpertSerializer, 
    AuditLogSerializer,
    NotificationSerializer
)

# Helper function to get the main admin user for alerts
def get_admin_user():
    return User.objects.filter(is_superuser=True).first() or User.objects.first()

# ==========================================
# 1. PROFILE (Internal - Requires Login)
# ==========================================
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    # Get profile or create if missing (Self-healing)
    profile, created = Profile.objects.get_or_create(user=request.user)

    if request.method == 'GET':
        serializer = ProfileSerializer(profile)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = ProfileSerializer(profile, data=request.data)
        if serializer.is_valid():
            serializer.save()
            
            # Save to Audit Trail
            AuditLog.objects.create(
                user=request.user,
                action="Updated Profile",
                details=f"Updated details for {request.data.get('companyName', 'Company')}"
            )
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_logs_list(request):
    # Get the last 10 logs, newest first
    logs = AuditLog.objects.filter(user=request.user).order_by('-timestamp')[:10]
    serializer = AuditLogSerializer(logs, many=True)
    return Response(serializer.data)

# ==========================================
# 2. SERVICE REQUESTS (Linked to Group 3)
# ==========================================
@api_view(['GET', 'POST']) 
@permission_classes([IsAuthenticated])
def service_requests_list(request):
    if request.method == 'GET':
        requests_list = ServiceRequest.objects.all()
        serializer = ServiceRequestSerializer(requests_list, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        # Group 3 sends a request
        serializer = ServiceRequestSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()

            # 🔔 TRIGGER: Notify Admin about New Request
            admin_user = get_admin_user()
            if admin_user:
                Notification.objects.create(
                    user=admin_user, 
                    message=f"New Request Received: {request.data.get('role', 'Expert')}"
                )

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_offer(request, request_id):
    service_req = get_object_or_404(ServiceRequest, id=request_id)
    offer_data = request.data 

    # --- SIMULATION MODE ---
    print("---------------------------------------------------")
    print(f"🚀 SIMULATION: Sending Offer to Group 3 for Req ID: {request_id}")
    print(f"💰 Price: {offer_data.get('price')} | 👤 Expert: {offer_data.get('expert_name')}")
    print("---------------------------------------------------")
    
    service_req.status = "Offer Sent"
    service_req.save()
    return Response({"status": "Simulation: Offer sent successfully!"})

# ==========================================
# 3. CONTRACTS (Linked to Group 2)
# ==========================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def contracts_list(request):
    contracts = Contract.objects.all()
    serializer = ContractSerializer(contracts, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([AllowAny])
def receive_contract_draft(request):
    data = request.data
    if 'title' not in data:
        return Response({"error": "Missing title"}, status=400)

    Contract.objects.create(
        title=data['title'],
        client_name=data.get('client_name', 'Unknown Client'),
        date=data.get('date', timezone.now()),
        status='Pending'
    )

    # 🔔 TRIGGER: Notify Admin about New Contract
    admin_user = get_admin_user()
    if admin_user:
        Notification.objects.create(
            user=admin_user, 
            message=f"New Contract Draft: {data.get('title')}"
        )

    return Response({"status": "Contract received"}, status=201)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sign_contract(request, contract_id):
    contract = get_object_or_404(Contract, id=contract_id)

    print(f"✍️ SIMULATION: Signing Contract '{contract.title}'")

    contract.status = 'Signed'
    contract.save()
    return Response({'status': 'Simulation: Signed locally'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def negotiate_contract(request, contract_id):
    contract = get_object_or_404(Contract, id=contract_id)
    new_terms = request.data.get('proposal')

    if not new_terms:
        return Response({"error": "Proposal text is required"}, status=400)

    contract.counter_proposal = new_terms
    contract.status = 'Negotiation'
    contract.save()

    # Log it
    AuditLog.objects.create(
        user=request.user,
        action="Counter-Offer Sent",
        details=f"Proposed changes for {contract.title}"
    )

    print(f"🔄 NEGOTIATION: Sending counter-offer for '{contract.title}'")
    return Response({'status': 'Counter-offer sent successfully!'})

@api_view(['POST'])
@permission_classes([AllowAny]) 
def update_contract_status(request, contract_id):
    """
    Endpoint for Group 2 to update status (Accept/Reject negotiation).
    """
    contract = get_object_or_404(Contract, id=contract_id)
    new_status = request.data.get('status')
    client_message = request.data.get('message', '')

    if new_status not in ['Pending', 'Signed', 'Rejected']:
        return Response({"error": "Invalid status update"}, status=400)

    old_status = contract.status
    contract.status = new_status
    contract.save()

    # Log the system action
    admin_user = get_admin_user()
    if admin_user:
        AuditLog.objects.create(
            user=admin_user,
            action="Client Updated Status",
            details=f"From {old_status} to {new_status}. Msg: {client_message}"
        )
        
        # 🔔 TRIGGER: Notify Admin about Client Reply
        Notification.objects.create(
            user=admin_user, 
            message=f"Client Reply: Contract is now {new_status}"
        )

    return Response({"status": f"Contract {contract_id} updated to {new_status}"})

# ==========================================
# 4. REPORTING (Linked to Group 5)
# ==========================================
@api_view(['GET'])
@permission_classes([AllowAny]) 
def reporting_data(request):
    stats = {
        "provider_id": "4a",
        "metrics": {
            "total_requests": ServiceRequest.objects.count(),
            "active_contracts": Contract.objects.filter(status='Signed').count(),
            "pending_offers": ServiceRequest.objects.filter(status='Open').count(),
        },
        "status": "Online"
    }
    return Response(stats)

# ==========================================
# 5. EXPERT INVENTORY
# ==========================================
@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny]) 
def expert_list(request):
    experts = Expert.objects.all()
    serializer = ExpertSerializer(experts, many=True)
    return Response(serializer.data)

# ==========================================
# 6. NOTIFICATIONS SYSTEM
# ==========================================
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def notifications_view(request):
    # GET: Fetch unread notifications
    if request.method == 'GET':
        notifs = Notification.objects.filter(user=request.user, is_read=False).order_by('-timestamp')
        serializer = NotificationSerializer(notifs, many=True)
        return Response(serializer.data)
    
    # PUT: Mark all as read (Clear the badge)
    elif request.method == 'PUT':
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'Notifications cleared'})
    
    # In backend/core/views.py

# In backend/core/views.py

@api_view(['GET'])
@permission_classes([AllowAny]) 
def dashboard_stats(request):
    """
    Returns real-time counters.
    """
    # 1. Count Signed Contracts (Money made)
    active_contracts = Contract.objects.filter(status='Signed').count()
    
    # 2. Count "Pending" Requests (Only those needing an offer)
    # ⚠️ FIX: We filter for 'Open' instead of counting everything
    pending_requests = ServiceRequest.objects.filter(status='Open').count()
    
    # 3. Earnings Calculation
    total_earnings = active_contracts * 3000 

    return Response({
        "total_earnings": total_earnings,
        "active_contracts": active_contracts,
        "pending_requests": pending_requests,
        "client_rating": 4.8 
    })