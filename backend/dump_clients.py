import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'uniform_agri.settings')
django.setup()

from core.models import Client

data = []
for c in Client.objects.all():
    if c.subscription_modules:
        data.append({"farm": c.farm_name, "modules": c.subscription_modules})

with open('clients_dump.json', 'w') as f:
    json.dump(data, f, indent=2)
