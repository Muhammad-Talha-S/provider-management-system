from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("procurement", "0006_servicerequest_cycles_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="servicerequest",
            name="payload",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="servicerequest",
            name="domain",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="servicerequest",
            name="technology_level",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
        migrations.AddField(
            model_name="servicerequest",
            name="positions",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="serviceoffer",
            name="request_snapshot",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="serviceoffer",
            name="response",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="serviceoffer",
            name="deltas",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="serviceoffer",
            name="specialist",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="service_offers_as_specialist",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="serviceorder",
            name="service_offer",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="service_orders",
                to="procurement.serviceoffer",
            ),
        ),
        migrations.AlterField(
            model_name="serviceorder",
            name="specialist",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="service_orders_as_specialist",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
