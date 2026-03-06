import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.join(os.getcwd()))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'uniform_agri.settings')
django.setup()

from core.models import SubscriptionModule, GeneticsSerial, Client

MASTER_MODULES = [
    "UNIFORM - Global Professional (till 250 Milk. Cows)* incl. App",
    "Country specific links (FR / DU / DK / Fin / NO / Rus / etc.)",
    "Link process computer Lely Horizon/T4C | GEA DairyNet",
    "Link process computer (milking parlour/robot / activity / feeding / sorting)",
    "Multiherd / Animal exchange (with data exchange / incl. extra database)",
    "Extra database (no exchange)",
    "Big farm module: 250 - 499 Milking Cows",
    "Big farm module: 500 - 749 Milking Cows",
    "Big farm module: 750 - 999 Milking Cows",
    "Big farm module: 1000 - 1999 Milking Cows",
    "Big farm module: 2000 - 2999 Milking Cows",
    "Big farm module: > 3000 Milking Cows"
]

TO_REMOVE_FRAGMENTS = [
    "incl. extra database)",
    "sorting)",
    "activity",
    "feeding"
]

def find_correct_name(current_name):
    # Try to find a match in MASTER_MODULES where the current name (or start of it) matches
    # This handles the cases where name has appended corruption
    for master in MASTER_MODULES:
        # If the master name is in the current name, or vice versa (partially)
        # E.g. 'UNIFORM - Global Pro... incl. Appatabase'
        clean_master_prefix = master.split('(')[0].strip()
        if clean_master_prefix in current_name:
            return master
    return None

def clean_assignment_string(s):
    if not s:
        return ""
    
    # 1. First, handle the specific corrupted fragments the user hates
    # We replace them with empty string first, but better to split by comma
    parts = [p.strip() for p in s.split(',')]
    cleaned_parts = []
    for p in parts:
        if p in TO_REMOVE_FRAGMENTS:
            continue
        
        # Try to map the part to a master module if it's a known old name or fragment
        # E.g. "Link process computer (milking parlour/robot"
        found = False
        for master in MASTER_MODULES:
            if p in master and len(p) > 10: # Avoid matching very short fragments too broadly
                cleaned_parts.append(master)
                found = True
                break
        if not found:
            cleaned_parts.append(p)
            
    # Remove duplicates and empty
    final = []
    for p in cleaned_parts:
        if p and p not in final:
            final.append(p)
    return ", ".join(final)

def run():
    print("Performing Absolute Module Reset...")
    
    # 1. Fix SubscriptionModule Table
    # Identify modules that don't match exactly
    for mod in SubscriptionModule.objects.all():
        if mod.name not in MASTER_MODULES:
            correct = find_correct_name(mod.name)
            if correct:
                print(f"Correcting Module {mod.id}: '{mod.name}' -> '{correct}'")
                mod.name = correct
                mod.save()
            else:
                # If it doesn't match any master and is purely junk or one of the user's fragments
                if mod.name in TO_REMOVE_FRAGMENTS or "atabase" in mod.name or "ing)" in mod.name:
                    print(f"Deleting Junk Module {mod.id}: '{mod.name}'")
                    mod.delete()
                else:
                    print(f"WARNING: Module {mod.id} '{mod.name}' doesn't match master and isn't obvious junk.")

    # 2. Clean Assignments
    for s in GeneticsSerial.objects.all():
        if s.modules:
            orig = s.modules
            cleaned = clean_assignment_string(orig)
            if cleaned != orig:
                print(f"Cleaned Serial {s.serial_number}: '{orig}' -> '{cleaned}'")
                s.modules = cleaned
                s.save()

    for c in Client.objects.all():
        if c.subscription_modules:
            orig = c.subscription_modules
            cleaned = clean_assignment_string(orig)
            if cleaned != orig:
                print(f"Cleaned Client {c.name}: '{orig}' -> '{cleaned}'")
                c.subscription_modules = cleaned
                c.save()

    print("Absolute Reset Completed.")

if __name__ == "__main__":
    run()
