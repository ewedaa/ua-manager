import os
import sys
import django

# Add the current directory to python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'uniform_agri.settings')
django.setup()

from core.models import SubscriptionModule

modules_data = [
    {
        "name": "UNIFORM - Global Professional (till 250 Milk. Cows)* incl. App",
        "desc": "includes Network installation and Manual entered milk overviews but only on request\nincludes Economy",
        "purchase": 1200,
        "renewal": 676
    },
    {
        "name": "Country specific links (FR, DU, DK, Fin, NO, Rus, etc.)",
        "desc": "",
        "purchase": 395,
        "renewal": 172
    },
    {
        "name": "Link process computer Lely Horizon/T4C | GEA DairyNet",
        "desc": "",
        "purchase": 495,
        "renewal": 303
    },
    {
        "name": "Link process computer (milking parlour/robot, activity, feeding, sorting)",
        "desc": "",
        "purchase": 495,
        "renewal": 172
    },
    {
        "name": "Multiherd / Animal exchange (with data exchange, incl. extra database)",
        "desc": "",
        "purchase": 240,
        "renewal": 107
    },
    {
        "name": "Extra database (no exchange)",
        "desc": "",
        "purchase": 120,
        "renewal": 82
    },
    {
        "name": "Big farm module: 250 - 499 Milking Cows",
        "desc": "per batch, Young stock free",
        "purchase": 250,
        "renewal": 186
    },
    {
        "name": "Big farm module: 500 - 749 Milking Cows",
        "desc": "per batch, Young stock free",
        "purchase": 250,
        "renewal": 186
    },
    {
        "name": "Big farm module: 750 - 999 Milking Cows",
        "desc": "per batch, Young stock free",
        "purchase": 250,
        "renewal": 186
    },
    {
        "name": "Big farm module: 1000 - 1999 Milking Cows",
        "desc": "per batch, Young stock free",
        "purchase": 250,
        "renewal": 186
    },
    {
        "name": "Big farm module: 2000 - 2999 Milking Cows",
        "desc": "per batch, Young stock free",
        "purchase": 250,
        "renewal": 186
    },
    {
        "name": "Big farm module: > 3000 Milking Cows",
        "desc": "per batch, Young stock free",
        "purchase": 250,
        "renewal": 186
    }
]

def seed():
    new_names = [m['name'] for m in modules_data]
    
    # Optional: Delete old modules that don't match the new explicit list
    # This ensures a clean slate like the image
    old_modules = SubscriptionModule.objects.exclude(name__in=new_names)
    for old in old_modules:
        print(f"Deleting outdated module: {old.name}")
        old.delete()

    for m in modules_data:
        mod, created = SubscriptionModule.objects.update_or_create(
            name=m['name'],
            defaults={
                'description': m['desc'],
                'purchase_price': m['purchase'],
                'renewal_price': m['renewal'],
                'is_active': True
            }
        )
        print(f"{'Created' if created else 'Updated'} module: {mod.name}")
        
if __name__ == '__main__':
    seed()
    print("Seeding complete.")
