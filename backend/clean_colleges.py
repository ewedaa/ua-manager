import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'uniform_agri.settings')
django.setup()

from core.models import Client

# Delete all clients that are actually 4genetics colleges
colleges = Client.objects.filter(is_4genetics_college=True)
count = colleges.count()
print(f"Found {count} clients that are colleges. Deleting...")
colleges.delete()
print("Deletion complete.")
