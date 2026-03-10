import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'uniform_agri.settings')
django.setup()

from core.models import SubscriptionModule

# Ensure the new modules exist and update their prices
modules_to_update = [
    "Link to DataFlow Milk processor",
    "Link to DelaVal Milk processor",
    "Link to Velos Nedap Milk processor",
    "Link SCR (SenseHub/HT)"
]

print("=== VERIFYING AND SETTING PRICES ===")

target_purchase_price = 544.50
target_renewal_price = 189.20

for name in modules_to_update:
    mod, created = SubscriptionModule.objects.get_or_create(name=name)
    mod.purchase_price = target_purchase_price
    mod.renewal_price = target_renewal_price
    # ensure it's active so it shows up
    mod.is_active = True
    mod.save()
    print(f"[{'NEW' if created else 'EXISTING'}] Updated '{name}': Purchase={mod.purchase_price}, Renewal={mod.renewal_price}")

# Double check if the old one is still there and delete it
old_name = "Link process computer"
old_mod = SubscriptionModule.objects.filter(name=old_name).first()
if old_mod:
    print(f"\nFound old generic module '{old_name}'... DELETING.")
    old_mod.delete()
else:
    print(f"\nOld generic module '{old_name}' is already deleted.")

# Make sure we didn't leave empty string modules
empty_mod = SubscriptionModule.objects.filter(name="").first()
if empty_mod:
    empty_mod.delete()

print("\nAll done! Configuration is fully reset and clean.")
