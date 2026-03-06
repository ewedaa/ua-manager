import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.join(os.getcwd()))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'uniform_agri.settings')
django.setup()

from core.models import GeneticsSerial, Client, SubscriptionModule

print("--- SubscriptionModules ---")
for m in SubscriptionModule.objects.all():
    print(f"ID:{m.id} | NAME: '{m.name}'")

print("\n--- GeneticsSerials with Modules ---")
for s in GeneticsSerial.objects.all():
    if s.modules:
        print(f"ID:{s.id} | SN: {s.serial_number} | MODS: '{s.modules}'")

print("\n--- Clients with Modules ---")
for c in Client.objects.all():
    if c.subscription_modules:
        print(f"ID:{c.id} | NAME: {c.name} | MODS: '{c.subscription_modules}'")
