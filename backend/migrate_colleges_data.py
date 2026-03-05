import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'uniform_agri.settings')
django.setup()

from core.models import GeneticsSerial

serials = GeneticsSerial.objects.all()
count = 0
for s in serials:
    if s.client and s.client.farm_name:
        s.college_name = s.client.farm_name
        s.save(update_fields=['college_name'])
        count += 1

print(f"Successfully migrated {count} serials.")
