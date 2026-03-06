import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.join(os.getcwd()))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'uniform_agri.settings')
django.setup()

from core.models import SubscriptionModule

MASTER_MAP = {
    "UNIFORM - Global Professional": "UNIFORM - Global Professional (till 250 Milk. Cows)* incl. App",
    "Country specific links": "Country specific links (FR / DU / DK / Fin / NO / Rus / etc.)",
    "Link process computer Lely": "Link process computer Lely Horizon/T4C | GEA DairyNet",
    "Link process computer (milking": "Link process computer (milking parlour/robot / activity / feeding / sorting)",
    "Multiherd / Animal exchange": "Multiherd / Animal exchange (with data exchange / incl. extra database)",
    "Extra database (no exchange)": "Extra database (no exchange)",
    "Big farm module: 250 - 499": "Big farm module: 250 - 499 Milking Cows",
    "Big farm module: 500 - 749": "Big farm module: 500 - 749 Milking Cows",
    "Big farm module: 750 - 999": "Big farm module: 750 - 999 Milking Cows",
    "Big farm module: 1000 - 1999": "Big farm module: 1000 - 1999 Milking Cows",
    "Big farm module: 2000 - 2999": "Big farm module: 2000 - 2999 Milking Cows",
    "Big farm module: > 3000": "Big farm module: > 3000 Milking Cows"
}

def run():
    print("Forced Module Name Cleanup...")
    for mod in SubscriptionModule.objects.all():
        original = mod.name
        found = False
        for prefix, correct in MASTER_MAP.items():
            if prefix in original:
                if original != correct:
                    print(f"FORCING {mod.id}: '{original}' -> '{correct}'")
                    mod.name = correct
                    mod.save()
                found = True
                break
        
        if not found:
            # Check for pure corruption or fragments
            JUNK_FRAGMENTS = ["incl. extra database)", "sorting)", "activity", "feeding", "atabase)", "ing)"]
            is_junk = any(f in original for f in JUNK_FRAGMENTS)
            if is_junk:
                print(f"DELETING JUNK {mod.id}: '{original}'")
                mod.delete()
            else:
                print(f"Unknown module {mod.id}: '{original}'")

    print("Cleanup Done.")

if __name__ == "__main__":
    run()
