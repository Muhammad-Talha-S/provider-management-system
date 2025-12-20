from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import Profile, ServiceRequest, Contract
from .serializers import ProfileSerializer, ServiceRequestSerializer, ContractSerializer
import requests # Needed to talk to other groups

# ==========================================
# 1. PROFILE (Internal)
# ==========================================
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    try:
        profile = request.user.profile
    except Profile.DoesNotExist:
        return Response({'error': 'Profile not found'}, status=404)

    if request.method == 'GET':
        serializer = ProfileSerializer(profile)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = ProfileSerializer(profile, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

# ==========================================
# 2. SERVICE REQUESTS (Linked to Group 3)
# ==========================================
@api_view(['GET', 'POST']) 
@permission_classes([IsAuthenticated])
def service_requests_list(request):
    # GET: You viewing the list
    if request.method == 'GET':
        requests_list = ServiceRequest.objects.all()
        serializer = ServiceRequestSerializer(requests_list, many=True)
        return Response(serializer.data)

    # POST: Group 3 sending you a new job
    elif request.method == 'POST':
        serializer = ServiceRequestSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_offer(request, request_id):
    """
    Send an offer back to Group 3.
    """
    service_req = get_object_or_404(ServiceRequest, id=request_id)
    offer_data = request.data 

    # --- SIMULATION MODE (Testing Locally) ---
    print("---------------------------------------------------")
    print(f"🚀 SIMULATION: Sending Offer to Group 3 for Req ID: {request_id}")
    print(f"💰 Price: {offer_data.get('price')} | 📅 Availability: {offer_data.get('availability')}")
    print("---------------------------------------------------")
    
    service_req.status = "Offer Sent"
    service_req.save()
    return Response({"status": "Simulation: Offer sent successfully!"})

    # --- REAL MODE (Uncomment when you have Group 3's URL) ---
    # group3_url = "http://group3-ip:8000/api/receive-offer/"
    # payload = {
    #     "original_request_id": service_req.id,
    #     "provider_name": "Group 4a",
    #     "price": offer_data.get('price'),
    #     "availability": offer_data.get('availability')
    # }
    # try:
    #     requests.post(group3_url, json=payload)
    #     service_req.status = "Offer Sent"
    #     service_req.save()
    #     return Response({"status": "Offer sent!"})
    # except:
    #     return Response({"error": "Failed to connect to Group 3"}, status=500)


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
@permission_classes([IsAuthenticated])
def receive_contract_draft(request):
    """
    Group 2 posts a draft here.
    """
    data = request.data
    if 'title' not in data or 'client_name' not in data:
        return Response({"error": "Missing fields"}, status=400)

    Contract.objects.create(
        title=data['title'],
        client_name=data['client_name'],
        date=data.get('date', timezone.now()),
        status='Pending'
    )
    return Response({"status": "Contract received"}, status=201)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sign_contract(request, contract_id):
    contract = get_object_or_404(Contract, id=contract_id)

    # --- SIMULATION MODE ---
    print("---------------------------------------------------")
    print(f"✍️ SIMULATION: Signing Contract '{contract.title}' -> Sending to Group 2")
    print("---------------------------------------------------")

    contract.status = 'Signed'
    contract.save()
    return Response({'status': 'Simulation: Signed locally'})

    # --- REAL MODE (Uncomment later) ---
    # group2_url = "http://group2-ip:8000/api/update-status/"
    # requests.post(group2_url, json={"id": contract.id, "status": "Signed"})

# ==========================================
# 4. REPORTING (Linked to Group 5)
# ==========================================
@api_view(['GET'])
def reporting_data(request):
    """
    Group 5 pulls stats from here.
    """
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