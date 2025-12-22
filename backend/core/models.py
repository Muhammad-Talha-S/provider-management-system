from django.db import models
from django.contrib.auth.models import User

# 1. US-06: Profile Data
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    company_name = models.CharField(max_length=200)
    address = models.TextField()
    tax_id = models.CharField(max_length=50)
    contact_email = models.EmailField()

    def __str__(self):
        return self.company_name

# 2. US-08: Service Requests (Incoming Jobs)
class ServiceRequest(models.Model):
    role = models.CharField(max_length=100)  # e.g., "Frontend Dev"
    skill = models.CharField(max_length=100) # e.g., "React"
    duration = models.CharField(max_length=50)
    start_date = models.DateField()
    status = models.CharField(max_length=20, default='Open')

    def __str__(self):
        return f"{self.role} ({self.skill})"

# 3. US-09: Contracts
class Contract(models.Model):
    title = models.CharField(max_length=200)
    client_name = models.CharField(max_length=200)
    date = models.DateField()
    status = models.CharField(max_length=20, default='Pending') # Pending, Signed, Rejected
    counter_proposal = models.TextField(blank=True, null=True)
    def __str__(self):
        return self.title

# 4. Expert Inventory (The Fix: Un-indented this class)
class Expert(models.Model):
    name = models.CharField(max_length=100)
    role = models.CharField(max_length=100)  # e.g., "React Developer"
    rate = models.DecimalField(max_digits=6, decimal_places=2)  # e.g., 85.00
    status = models.CharField(max_length=20, default='Available') # Available/Busy

    def __str__(self):
        return f"{self.name} ({self.role})"
    
    # ... (existing models) ...

class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=255) # e.g., "Updated Company Name"
    details = models.TextField(blank=True, null=True) # e.g., "Old: A, New: B"
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.action}"
    
    # In backend/core/models.py

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.message