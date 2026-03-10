import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'uniform_agri.settings')
django.setup()

from core.models import SubscriptionModule

new_name = "Link SCR (SenseHub/HT)"

print("=== STARTING SCRIPT ===")

mod, created = SubscriptionModule.objects.get_or_create(name=new_name)
if created:
    print(f"Created new module: '{new_name}'")
    mod.is_active = True
    mod.save()
else:
    print(f"Module '{new_name}' already exists.")

print("Done.")
