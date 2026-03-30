import os
import re

base_dir = r"c:\Users\moham\Desktop\UA Manager\backend\core"
views_path = os.path.join(base_dir, 'views.py')
out_dir = os.path.join(base_dir, 'views_pkg') # Temp name, will rename to 'views' later

if not os.path.exists(out_dir):
    os.makedirs(out_dir)

with open(views_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Separate imports/globals from classes/functions
match = re.search(r'^(class |def )', content, flags=re.MULTILINE)
header = ""
body = content
if match:
    idx = match.start()
    header = content[:idx]
    body = content[idx:]

# Split text into chunks based on "class " 
chunks = re.split(r'^(?=class )', body, flags=re.MULTILINE)

# Grouping definitions
files = {
    'client_views.py': ['ClientViewSet', 'LivestockTypeViewSet', 'ClientFileViewSet', 'ClientContactView'],
    'invoice_views.py': ['InvoiceViewSet', 'PaymentViewSet'],
    'ticket_views.py': ['TicketViewSet', 'IssueCategoryViewSet', 'AITicketDraftView'],
    'genetics_views.py': ['GeneticsSerialViewSet', 'SubscriptionModuleViewSet'],
    'dashboard_views.py': ['DashboardStatsView', 'ChartDataView'],
    'agent_views.py': ['AgentQueryView', 'AISuggestionView', 'FileAnalysisView', 'InsightsView', 'AIClientSummaryView'],
    'notification_views.py': ['NotificationsView', 'MarkAllNotificationsReadView', 'DismissAllNotificationsView'],
    'report_views.py': ['EmailReportView', 'BusinessReportView', 'CustomReportView', 'ReportBuilderView', 'ReportBuilderPreviewView'],
    'project_activity_views.py': ['ActivityLogView', 'TodoView', 'ProjectViewSet']
}

class_to_file = {}
for fname, classes in files.items():
    for c in classes:
        class_to_file[c] = fname

output_contents = {fname: header for fname in files.keys()}
output_contents['misc_views.py'] = header

for chunk in chunks:
    if not chunk.strip(): continue
    m = re.search(r'^class\s+([A-Za-z0-9_]+)', chunk)
    if m:
        cname = m.group(1)
        fname = class_to_file.get(cname, 'misc_views.py')
        output_contents[fname] += chunk
    else:
        output_contents['misc_views.py'] += chunk

for fname, text in output_contents.items():
    with open(os.path.join(out_dir, fname), 'w', encoding='utf-8') as f:
        f.write(text)

# Create an __init__.py that imports all of them
init_content = ""
for fname in output_contents.keys():
    mod_name = fname.replace('.py', '')
    init_content += f"from .{mod_name} import *\n"

with open(os.path.join(out_dir, '__init__.py'), 'w', encoding='utf-8') as f:
    f.write(init_content)

print(f"Splitting complete. Files written to {out_dir}")
