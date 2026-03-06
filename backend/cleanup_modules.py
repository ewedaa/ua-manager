import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.join(os.getcwd()))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'uniform_agri.settings')
django.setup()

from core.models import SubscriptionModule, GeneticsSerial, Client

TO_DELETE = [
    "incl. extra database)",
    "sorting)",
    "activity",
    "feeding"
]

STRINGS_TO_CLEAN = {
    ". Appatabase)ng)": "",
    "incl. App": "incl. App", # Keep if it's valid, but check if it's part of the corruption
}

def clean_module_string(s):
    if not s:
        return ""
    # Split by comma
    modules = [m.strip() for m in s.split(',')]
    # Remove any that match TO_DELETE exactly
    cleaned = [m for m in modules if m not in TO_DELETE]
    # Filter out empty strings
    cleaned = [m for m in cleaned if m]
    return ", ".join(cleaned)

def run_cleanup():
    print("Starting Data Cleanup...")
    
    # 1. Clean up SubscriptionModule names
    for mod in SubscriptionModule.objects.all():
        original_name = mod.name
        new_name = original_name
        
        # Remove corrupted suffixes
        for corrupt, replacement in STRINGS_TO_CLEAN.items():
            if corrupt in new_name:
                new_name = new_name.replace(corrupt, replacement).strip()
        
        # If the name IS one of the TO_DELETE ones, we delete the module
        if new_name in TO_DELETE:
            print(f"Deleting module: {original_name}")
            mod.delete()
            continue
            
        if new_name != original_name:
            print(f"Updating module: {original_name} -> {new_name}")
            mod.name = new_name
            mod.save()

    # 2. Clean up GeneticsSerial records
    for serial in GeneticsSerial.objects.all():
        if not serial.modules:
            continue
        original_modules = serial.modules
        cleaned_modules = clean_module_string(original_modules)
        
        if cleaned_modules != original_modules:
            print(f"Cleaning serial {serial.serial_number}: {original_modules} -> {cleaned_modules}")
            serial.modules = cleaned_modules
            serial.save()

    # 3. Clean up Client records
    for client in Client.objects.all():
        if not client.subscription_modules:
            continue
        original_modules = client.subscription_modules
        cleaned_modules = clean_module_string(original_modules)
        
        if cleaned_modules != original_modules:
            print(f"Cleaning client {client.name}: {original_modules} -> {cleaned_modules}")
            client.subscription_modules = cleaned_modules
            client.save()

    print("Cleanup Completed Successfully.")

if __name__ == "__main__":
    run_cleanup()
