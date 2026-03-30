import os
import glob

files = glob.glob(r'c:\Users\moham\Desktop\UA Manager\backend\core\views\*.py')
for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    content = content.replace('from .models import', 'from core.models import')
    content = content.replace('from .serializers import', 'from core.serializers import')
    content = content.replace('from .report_generator import', 'from core.report_generator import')

    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
print("Fixed imports in views/")
