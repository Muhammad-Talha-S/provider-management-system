from django.db import models

class Provider(models.Model):
    STATUS_CHOICES = [("Active", "Active"), ("Inactive", "Inactive")]

    # Using your IDs like "P001" as primary key keeps frontend mapping simple
    id = models.CharField(primary_key=True, max_length=10)
    name = models.CharField(max_length=255)

    contact_name = models.CharField(max_length=255)
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=50)
    address = models.TextField()

    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    preferred_language = models.CharField(max_length=30, default="English")

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="Active")
    created_at = models.DateField()

    def __str__(self):
        return f"{self.id} - {self.name}"
