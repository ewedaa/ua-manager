import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'uniform_agri.settings')
django.setup()

from core.models import SubscriptionModule
with open('modules_dump.json', 'w') as f:
    json.dump([m.name for m in SubscriptionModule.objects.all()], f)
