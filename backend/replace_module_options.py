import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'uniform_agri.settings')
django.setup()

from core.models import SubscriptionModule

old_name = "Link process computer"
new_names = [
    "Link to DataFlow Milk processor",
    "Link to DelaVal Milk processor",
    "Link to Velos Nedap Milk processor"
]

print("=== REPLACING MODULE ===")

# Delete the old one if it exists
old_mod = SubscriptionModule.objects.filter(name=old_name).first()
if old_mod:
    print(f"Deleting old module: '{old_mod.name}'")
    old_mod.delete()
else:
    print(f"Old module '{old_name}' not found.")

# Create new ones
for name in new_names:
    mod, created = SubscriptionModule.objects.get_or_create(name=name)
    if created:
        print(f"Created new module: '{name}'")
        mod.is_active = True
        mod.save()
    else:
        print(f"Module '{name}' already exists.")

print("Done.")
