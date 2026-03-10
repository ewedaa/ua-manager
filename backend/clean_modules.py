import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'uniform_agri.settings')
django.setup()

from core.models import SubscriptionModule, Client

print("=== CLEANING SUBSCRIPTION MODULES ===")

# 1. Delete bad fragments from SubscriptionModule table
bad_fragments = ["activity", "feeding", "sorting)", "sorting"]
deleted_count = 0

for m in SubscriptionModule.objects.all():
    name_lower = m.name.strip().lower()
    if name_lower in [b.lower() for b in bad_fragments]:
        print(f"Deleting broken module fragment: '{m.name}'")
        m.delete()
        deleted_count += 1
    # Also clean up if the main module name got imported with commas instead of slashes!
    elif ("milking parlour" in name_lower and ("activity" in name_lower or "," in m.name)):
        # Normalize it to the correct format with slashes, not commas
        correct_name = "Link process computer (milking parlour/robot / activity / feeding / sorting)"
        if m.name != correct_name:
            print(f"Renaming module '{m.name}' -> '{correct_name}'")
            m.name = correct_name
            m.save()

print(f"✅ Deleted {deleted_count} broken module fragments from DB.")

# 2. Clean up Client subscription_modules text field
print("\n=== CLEANING CLIENT RECORDS ===")
cleaned_clients = 0

for client in Client.objects.all():
    if not client.subscription_modules:
        continue
        
    modules_str = client.subscription_modules
    original_str = modules_str
    
    # Let's replace the comma-separated version with the correct slash version
    # so it doesn't get split into separate pieces.
    if "Link process computer" in modules_str or "milking parlour" in modules_str:
        # If it has commas inside the parenthesis, replace them with slashes
        modules_str = modules_str.replace("milking parlour/robot, activity, feeding, sorting)", "milking parlour/robot / activity / feeding / sorting)")
        modules_str = modules_str.replace("milking parlour/robot , activity , feeding , sorting)", "milking parlour/robot / activity / feeding / sorting)")
    
    # Split the remainder by comma to filter out standalone bad fragments
    modules_list = [m.strip() for m in modules_str.split(',')]
    cleaned_list = []
    
    for mod in modules_list:
        if not mod:
            continue
        if mod.lower() in [b.lower() for b in bad_fragments]:
            # Skip this fragment because it was accidentally attached standalone
            continue
        cleaned_list.append(mod)

    # Join back together
    new_modules_str = ", ".join(cleaned_list)
    
    if new_modules_str != original_str:
        client.subscription_modules = new_modules_str
        client.save()
        cleaned_clients += 1
        print(f"Cleaned client {client.farm_name}:")
        print(f"  Old: {original_str}")
        print(f"  New: {new_modules_str}")

print(f"✅ Cleaned {cleaned_clients} client records.")
