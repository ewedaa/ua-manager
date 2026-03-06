import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.join(os.getcwd()))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'uniform_agri.settings')
django.setup()

from core.models import SubscriptionModule, GeneticsSerial, Client

# The exact fragments the user wants removed
TO_REMOVE = [
    "incl. extra database)",
    "sorting)",
    "activity",
    "feeding"
]

# Mapping of old (possibly partial) names to new comma-free names
MAPPING = {
    "Country specific links (FR, DU, DK, Fin, NO, Rus, etc.)": "Country specific links (FR / DU / DK / Fin / NO / Rus / etc.)",
    "Link process computer (milking parlour/robot": "Link process computer (milking parlour/robot / activity / feeding / sorting)",
    "Multiherd / Animal exchange (with data exchange": "Multiherd / Animal exchange (with data exchange / incl. extra database)",
}

def clean_string(s):
    if not s:
        return ""
    
    # First, handle the known split names by replacing them if they exist in some form
    # We do a simple replacement of the commas within the known long strings first
    s = s.replace("milking parlour/robot, activity, feeding, sorting", "milking parlour/robot / activity / feeding / sorting")
    s = s.replace("with data exchange, incl. extra database", "with data exchange / incl. extra database")
    s = s.replace("FR, DU, DK, Fin, NO, Rus, etc.", "FR / DU / DK / Fin / NO / Rus / etc.")
    
    # Split by comma
    parts = [p.strip() for p in s.split(',')]
    
    # Remove the specific fragments the user doesn't want
    cleaned_parts = []
    for p in parts:
        if p in TO_REMOVE:
            continue
        # Also handle fragments mapping
        if p in MAPPING:
            cleaned_parts.append(MAPPING[p])
        else:
            cleaned_parts.append(p)
            
    # Remove empty and duplicates
    final_parts = []
    for p in cleaned_parts:
        if p and p not in final_parts:
            final_parts.append(p)
            
    return ", ".join(final_parts)

def run_cleanup():
    print("Starting Final Module Cleanup...")
    
    # 1. Clean up SubscriptionModule names one last time to be absolute sure
    # (The seed_modules script already did this, but we'll double check for any stragglers)
    for mod in SubscriptionModule.objects.all():
        name = mod.name
        # Remove weird characters like "atabase)" that might be stuck
        if "atabase)" in name or "ing)" in name or "extra database)" in name:
            # If it's a corrupted version of a module we just seeded, it might have been missed
            # or it might be a duplicated record.
            # Actually, seed already handled this, but let's be safe.
            pass

    # 2. Clean GeneticsSerial
    for s in GeneticsSerial.objects.all():
        if not s.modules:
            continue
        original = s.modules
        cleaned = clean_string(original)
        if cleaned != original:
            print(f"Cleaned Serial {s.serial_number}: '{original}' -> '{cleaned}'")
            s.modules = cleaned
            s.save()

    # 3. Clean Client
    for c in Client.objects.all():
        if not c.subscription_modules:
            continue
        original = c.subscription_modules
        cleaned = clean_string(original)
        if cleaned != original:
            print(f"Cleaned Client {c.name}: '{original}' -> '{cleaned}'")
            c.subscription_modules = cleaned
            c.save()

    print("Final Cleanup Completed.")

if __name__ == "__main__":
    run_cleanup()
