from django.db import migrations


def seed_categories(apps, schema_editor):
    IssueCategory = apps.get_model('core', 'IssueCategory')
    defaults = [
        ('Database', 1),
        ('Milk Meter', 2),
        ('Activity System', 3),
        ('Other', 4),
    ]
    for name, order in defaults:
        IssueCategory.objects.get_or_create(name=name, defaults={'order': order})


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0020_issuecategory_ticket_contact_person_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_categories, migrations.RunPython.noop),
    ]
