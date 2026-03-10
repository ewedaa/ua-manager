import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'uniform_agri.settings')
django.setup()

from core.models import SubscriptionModule

modules_to_update = [
    "Link to DataFlow Milk processor",
    "Link to DelaVal Milk processor",
    "Link to Velos Nedap Milk processor",
    "Link SCR (SenseHub/HT)"
]

print("=== SETTING MODULE PRICES ===")

# The original Link process computer had this exact price configuration:
target_purchase_price = 495.00
target_renewal_price = 172.00

for name in modules_to_update:
    mod, created = SubscriptionModule.objects.get_or_create(name=name)
    mod.purchase_price = target_purchase_price
    mod.renewal_price = target_renewal_price
    mod.save()
    print(f"Updated '{name}' to Purchase: {mod.purchase_price} | Renewal: {mod.renewal_price}")

print("Done.")
