from django.core.management.base import BaseCommand
from django.utils.dateparse import parse_date

from providers.models import Provider
from accounts.models import User


MOCK_PROVIDERS = [
    {
        "id": "P001",
        "name": "TechProvide GmbH",
        "contactName": "Anna Schmidt",
        "contactEmail": "info@techprovide.com",
        "contactPhone": "+49 69 12345678",
        "address": "Nibelungenplatz 1, 60318 Frankfurt am Main, Germany",
        "communicationPreferences": {
            "emailNotifications": True,
            "smsNotifications": False,
            "preferredLanguage": "German",
        },
        "status": "Active",
        "createdAt": "2023-01-10",
    },
    {
        "id": "P002",
        "name": "CloudExperts AG",
        "contactName": "Michael Berg",
        "contactEmail": "contact@cloudexperts.de",
        "contactPhone": "+49 89 98765432",
        "address": "Leopoldstraße 50, 80802 Munich, Germany",
        "communicationPreferences": {
            "emailNotifications": True,
            "smsNotifications": True,
            "preferredLanguage": "English",
        },
        "status": "Active",
        "createdAt": "2022-11-15",
    },
]

MOCK_USERS = [
    {
        "id": "U001",
        "name": "Anna Schmidt",
        "email": "anna.schmidt@techprovide.com",
        "password": "admin123",
        "role": "Provider Admin",
        "providerId": "P001",
        "status": "Active",
        "createdAt": "2024-01-15",
    },
    {
        "id": "U002",
        "name": "Thomas Mueller",
        "email": "thomas.mueller@techprovide.com",
        "password": "supplier123",
        "role": "Supplier Representative",
        "providerId": "P001",
        "status": "Active",
        "createdAt": "2024-02-10",
    },
    {
        "id": "U003",
        "name": "Sarah Weber",
        "email": "sarah.weber@techprovide.com",
        "password": "coordinator123",
        "role": "Contract Coordinator",
        "providerId": "P001",
        "status": "Active",
        "createdAt": "2024-03-05",
    },
    {
        "id": "SP001",
        "name": "Michael Fischer",
        "email": "michael.fischer@techprovide.com",
        "password": "specialist123",
        "role": "Specialist",
        "providerId": "P001",
        "status": "Active",
        "createdAt": "2023-06-10",
        "materialNumber": "MAT001",
        "experienceLevel": "Senior",
        "technologyLevel": "Advanced",
        "performanceGrade": "A",
        "averageDailyRate": 850,
        "skills": ["React", "Node.js", "TypeScript", "AWS"],
        "availability": "Available",
        "serviceRequestsCompleted": 12,
        "serviceOrdersActive": 0,
    },
    {
        "id": "SP002",
        "name": "Julia Bauer",
        "email": "julia.bauer@techprovide.com",
        "password": "specialist123",
        "role": "Specialist",
        "providerId": "P001",
        "status": "Active",
        "createdAt": "2023-08-20",
        "materialNumber": "MAT002",
        "experienceLevel": "Mid",
        "technologyLevel": "Intermediate",
        "performanceGrade": "B",
        "averageDailyRate": 650,
        "skills": ["Java", "Spring Boot", "PostgreSQL"],
        "availability": "Partially Booked",
        "serviceRequestsCompleted": 8,
        "serviceOrdersActive": 1,
    },
    {
        "id": "SP003",
        "name": "Andreas Wagner",
        "email": "andreas.wagner@techprovide.com",
        "password": "specialist123",
        "role": "Specialist",
        "providerId": "P001",
        "status": "Active",
        "createdAt": "2023-04-15",
        "materialNumber": "MAT003",
        "experienceLevel": "Expert",
        "technologyLevel": "Expert",
        "performanceGrade": "A",
        "averageDailyRate": 950,
        "skills": ["Docker", "Kubernetes", "Jenkins", "Terraform"],
        "availability": "Available",
        "serviceRequestsCompleted": 15,
        "serviceOrdersActive": 0,
    },
    {
        "id": "SP004",
        "name": "Laura Klein",
        "email": "laura.klein@techprovide.com",
        "password": "specialist123",
        "role": "Specialist",
        "providerId": "P001",
        "status": "Active",
        "createdAt": "2024-01-10",
        "materialNumber": "MAT004",
        "experienceLevel": "Junior",
        "technologyLevel": "Basic",
        "performanceGrade": "B",
        "averageDailyRate": 450,
        "skills": ["React", "CSS", "JavaScript"],
        "availability": "Available",
        "serviceRequestsCompleted": 3,
        "serviceOrdersActive": 0,
    },
    {
        "id": "SP005",
        "name": "Marcus Weber",
        "email": "marcus.weber@techprovide.com",
        "password": "specialist123",
        "role": "Specialist",
        "providerId": "P001",
        "status": "Active",
        "createdAt": "2023-11-20",
        "materialNumber": "MAT005",
        "experienceLevel": "Senior",
        "technologyLevel": "Advanced",
        "performanceGrade": "A",
        "averageDailyRate": 800,
        "skills": ["Python", "Django", "FastAPI", "Machine Learning"],
        "availability": "Partially Booked",
        "serviceRequestsCompleted": 10,
        "serviceOrdersActive": 1,
    },
    {
        "id": "U004",
        "name": "Michael Berg",
        "email": "michael.berg@cloudexperts.de",
        "password": "admin123",
        "role": "Provider Admin",
        "providerId": "P002",
        "status": "Active",
        "createdAt": "2022-11-15",
    },
]


class Command(BaseCommand):
    help = "Seed database with mock providers and users."

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Seeding mock data..."))

        # Providers
        for p in MOCK_PROVIDERS:
            provider, _ = Provider.objects.update_or_create(
                id=p["id"],
                defaults={
                    "name": p["name"],
                    "contact_name": p["contactName"],
                    "contact_email": p["contactEmail"],
                    "contact_phone": p["contactPhone"],
                    "address": p["address"],
                    "email_notifications": p["communicationPreferences"]["emailNotifications"],
                    "sms_notifications": p["communicationPreferences"]["smsNotifications"],
                    "preferred_language": p["communicationPreferences"]["preferredLanguage"],
                    "status": p["status"],
                    "created_at": parse_date(p["createdAt"]),
                },
            )
            self.stdout.write(f"✓ Provider {provider.id} seeded")

        # Users
        for u in MOCK_USERS:
            provider = Provider.objects.get(id=u["providerId"])

            user, created = User.objects.update_or_create(
                id=u["id"],
                defaults={
                    "name": u["name"],
                    "email": u["email"],
                    "role": u["role"],
                    "provider": provider,
                    "status": u["status"],
                    "created_at": parse_date(u["createdAt"]),
                    # specialist fields
                    "material_number": u.get("materialNumber"),
                    "experience_level": u.get("experienceLevel"),
                    "technology_level": u.get("technologyLevel"),
                    "performance_grade": u.get("performanceGrade"),
                    "average_daily_rate": u.get("averageDailyRate"),
                    "skills": u.get("skills"),
                    "availability": u.get("availability"),
                    "service_requests_completed": u.get("serviceRequestsCompleted"),
                    "service_orders_active": u.get("serviceOrdersActive"),
                    # Django flags
                    "is_active": True,
                },
            )

            # Ensure password is hashed every time seed runs
            raw_password = u["password"]
            user.set_password(raw_password)
            user.save()

            self.stdout.write(f"✓ User {user.id} seeded ({'created' if created else 'updated'})")

        self.stdout.write(self.style.SUCCESS("✅ Seeding completed successfully."))
