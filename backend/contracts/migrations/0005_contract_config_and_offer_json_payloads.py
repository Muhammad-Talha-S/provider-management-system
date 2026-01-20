from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("contracts", "0004_contract_accepted_request_types_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="contract",
            name="external_snapshot",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="contract",
            name="config",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="contractoffer",
            name="request_snapshot",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="contractoffer",
            name="response",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="contractoffer",
            name="deltas",
            field=models.JSONField(blank=True, null=True),
        ),
    ]
