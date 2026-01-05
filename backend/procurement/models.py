from django.db import models


class ServiceRequest(models.Model):
    STATUS_CHOICES = [
        ("Draft", "Draft"),
        ("Open", "Open"),
        ("Closed", "Closed"),
    ]

    REQUEST_TYPE_CHOICES = [
        ("Single", "Single"),
        ("Multi", "Multi"),
        ("Team", "Team"),
        ("Work Contract", "Work Contract"),
    ]

    PERFORMANCE_LOCATION_CHOICES = [
        ("Onshore", "Onshore"),
        ("Nearshore", "Nearshore"),
        ("Offshore", "Offshore"),
    ]

    id = models.CharField(primary_key=True, max_length=20)  # e.g. SR001
    title = models.CharField(max_length=255)

    type = models.CharField(max_length=30, choices=REQUEST_TYPE_CHOICES)
    linked_contract_id = models.CharField(max_length=20)  # keep simple for now (Contracts milestone later)

    role = models.CharField(max_length=100)
    technology = models.CharField(max_length=255, blank=True, default="")
    experience_level = models.CharField(max_length=50)

    start_date = models.DateField()
    end_date = models.DateField()

    total_man_days = models.PositiveIntegerField(default=0)
    onsite_days = models.PositiveIntegerField(default=0)
    performance_location = models.CharField(max_length=20, choices=PERFORMANCE_LOCATION_CHOICES)

    required_languages = models.JSONField(default=list, blank=True)  # ["German","English"]
    must_have_criteria = models.JSONField(default=list, blank=True)  # [{name, weight}]
    nice_to_have_criteria = models.JSONField(default=list, blank=True)

    task_description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="Draft")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.id} - {self.title}"
