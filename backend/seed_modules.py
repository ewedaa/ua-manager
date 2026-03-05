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
        "name": "UNIFORM - Global Professional",
        "desc": "till 250 Milk Cows\nincludes Network installation\nincludes Manual entered milk overviews (on request)\nincludes Economy",
        "purchase": 1200,
        "renewal": 676
    },
    {
        "name": "Country specific links",
        "desc": "FR, DU, DK, Fin, NO, Rus, etc.",
        "purchase": 395,
        "renewal": 172
    },
    {
        "name": "Link process computer (Lely Horizon / GEA)",
        "desc": "Lely Horizon/T4C | GEA DairyNet",
        "purchase": 495,
        "renewal": 303
    },
    {
        "name": "Link process computer (milking parlour)",
        "desc": "milking parlour/robot, activity, feeding, sorting",
        "purchase": 495,
        "renewal": 172
    },
    {
        "name": "Multiherd / Animal exchange",
        "desc": "with data exchange, incl. extra database",
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
        "name": "Big farm module (250 - 999 Cows)",
        "desc": "per batch, Young stock free",
        "purchase": 250,
        "renewal": 186
    },
    {
        "name": "Big farm module (> 1000 Cows)",
        "desc": "per batch, Young stock free",
        "purchase": 250,
        "renewal": 186
    }
]

def seed():
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
