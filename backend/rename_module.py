import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'uniform_agri.settings')
django.setup()

from core.models import SubscriptionModule, Client

old_name = "Link process computer (milking parlour/robot / activity / feeding / sorting)"
new_name = "Link process computer"

print("=== RENAMING MODULE ===")

# 1. Update SubscriptionModule
mod = SubscriptionModule.objects.filter(name__startswith="Link process computer").first()
if mod:
    if mod.name != new_name:
        print(f"Renaming module:\n  From: '{mod.name}'\n  To:   '{new_name}'")
        mod.name = new_name
        mod.save()
    else:
        print(f"Module is already named '{new_name}'")
else:
    print(f"Module starting with 'Link process computer' not found.")

# 2. Update all clients
print("\n=== UPDATING CLIENT RECORDS ===")
clients_updated = 0
for client in Client.objects.all():
    if client.subscription_modules:
        modules = client.subscription_modules
        if "Link process computer" in modules:
            mod_list = [m.strip() for m in modules.split(',')]
            new_list = []
            for m in mod_list:
                if m.startswith("Link process computer"):
                    new_list.append(new_name)
                else:
                    new_list.append(m)
            
            # Remove duplicates while preserving order
            unique_list = []
            for item in new_list:
                if item not in unique_list:
                    unique_list.append(item)
                    
            new_modules_str = ", ".join(unique_list)
            if new_modules_str != client.subscription_modules:
                client.subscription_modules = new_modules_str
                client.save()
                clients_updated += 1
                print(f"Updated client {client.farm_name}")

print(f"✅ Updated {clients_updated} clients.")
