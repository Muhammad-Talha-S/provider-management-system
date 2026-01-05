from django.core.management.base import BaseCommand
from procurement.models import ServiceRequest
from datetime import date


class Command(BaseCommand):
    help = "Seed sample Service Requests"

    def handle(self, *args, **kwargs):
        data = [
            {
                "id": "SR001",
                "title": "React Developer for E-Commerce Platform",
                "type": "Single",
                "linked_contract_id": "C001",
                "role": "Frontend Developer",
                "technology": "React, TypeScript",
                "experience_level": "Mid",
                "start_date": date(2025, 2, 1),
                "end_date": date(2025, 5, 31),
                "total_man_days": 80,
                "onsite_days": 10,
                "performance_location": "Onshore",
                "required_languages": ["German", "English"],
                "must_have_criteria": [
                    {"name": "React experience > 3 years", "weight": 40},
                    {"name": "TypeScript proficiency", "weight": 30},
                    {"name": "E-commerce domain knowledge", "weight": 30},
                ],
                "nice_to_have_criteria": [
                    {"name": "Next.js experience", "weight": 20},
                    {"name": "UI/UX design skills", "weight": 20},
                ],
                "task_description": "Development of frontend components for a new e-commerce platform",
                "status": "Open",
            },
            {
                "id": "SR002",
                "title": "DevOps Engineer for Cloud Migration",
                "type": "Single",
                "linked_contract_id": "C002",
                "role": "DevOps Engineer",
                "technology": "AWS, Kubernetes, Terraform",
                "experience_level": "Senior",
                "start_date": date(2025, 1, 15),
                "end_date": date(2025, 6, 30),
                "total_man_days": 120,
                "onsite_days": 20,
                "performance_location": "Onshore",
                "required_languages": ["German", "English"],
                "must_have_criteria": [
                    {"name": "AWS certification", "weight": 35},
                    {"name": "Kubernetes experience > 2 years", "weight": 35},
                    {"name": "Infrastructure as Code (Terraform)", "weight": 30},
                ],
                "nice_to_have_criteria": [
                    {"name": "Monitoring tools (Prometheus, Grafana)", "weight": 25},
                ],
                "task_description": "Migration of legacy infrastructure to AWS cloud with Kubernetes orchestration",
                "status": "Open",
            },
        ]

        for item in data:
            ServiceRequest.objects.update_or_create(id=item["id"], defaults=item)

        self.stdout.write(self.style.SUCCESS("Seeded service requests successfully."))
