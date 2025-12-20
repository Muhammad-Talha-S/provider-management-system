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

    def __str__(self):
        return self.title