"""
Django management command to send a daily WhatsApp report via CallMeBot API.

Usage:
    python manage.py send_daily_whatsapp_report

Setup (one-time):
    1. Save this phone number in your contacts: +34 644 51 95 23
    2. Send this message to that number on WhatsApp:
       "I allow callmebot to send me messages"
    3. You'll receive an API key - set it as env variable:
       CALLMEBOT_API_KEY=<your_key>
    4. Set your phone number as env variable:
       WHATSAPP_PHONE=201019970162

PythonAnywhere Scheduled Task:
    cd /home/moewida/ua-manager/backend && python manage.py send_daily_whatsapp_report
"""

import os
import urllib.parse
import urllib.request
import urllib.error
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = 'Send a daily WhatsApp report with system stats via CallMeBot API'

    def add_arguments(self, parser):
        parser.add_argument(
            '--phone',
            type=str,
            default=os.environ.get('WHATSAPP_PHONE', '201019970162'),
            help='WhatsApp phone number (without +)',
        )
        parser.add_argument(
            '--apikey',
            type=str,
            default=os.environ.get('CALLMEBOT_API_KEY', ''),
            help='CallMeBot API key',
        )

    def handle(self, *args, **options):
        phone = options['phone']
        apikey = options['apikey']

        if not apikey:
            self.stderr.write(self.style.ERROR(
                'No CallMeBot API key provided. Set CALLMEBOT_API_KEY env variable '
                'or pass --apikey=YOUR_KEY.\n'
                'To get your API key:\n'
                '1. Save +34 644 51 95 23 in your contacts\n'
                '2. Send "I allow callmebot to send me messages" to that number on WhatsApp\n'
                '3. You will receive your API key'
            ))
            return

        self.stdout.write('Generating daily report...')
        report = self.generate_report()

        self.stdout.write('Sending WhatsApp message...')
        success = self.send_whatsapp(phone, apikey, report)

        if success:
            self.stdout.write(self.style.SUCCESS(f'Daily report sent to +{phone}'))
        else:
            self.stderr.write(self.style.ERROR('Failed to send WhatsApp message'))

    def generate_report(self):
        """Generate a comprehensive daily report with all system metrics."""
        from core.models import Client, Invoice, Ticket, GeneticsSerial, Payment

        now = timezone.now()
        today = now.date()

        # ---- Client Stats ----
        all_clients = Client.objects.all()
        total_clients = all_clients.count()

        active_clients = 0
        expiring_clients = 0
        expired_clients = 0
        demo_clients = 0
        expiring_names = []

        for c in all_clients:
            if c.is_demo:
                demo_clients += 1
            if c.subscription_end_date:
                days_left = (c.subscription_end_date - today).days
                if days_left < 0:
                    expired_clients += 1
                elif days_left <= 60:
                    expiring_clients += 1
                    expiring_names.append(f"  • {c.farm_name} ({days_left}d left)")
                else:
                    active_clients += 1
            else:
                active_clients += 1

        # ---- Invoice Stats ----
        all_invoices = Invoice.objects.all()
        total_invoices = all_invoices.count()
        due_invoices = all_invoices.filter(status='Due')
        due_count = due_invoices.count()
        due_total = sum(float(inv.total_amount or 0) for inv in due_invoices)

        paid_invoices = all_invoices.filter(status='Paid')
        paid_count = paid_invoices.count()
        paid_total = sum(float(inv.total_amount or 0) for inv in paid_invoices)

        # Recent payments (last 7 days)
        recent_payments = Payment.objects.filter(
            date__gte=today - timedelta(days=7)
        )
        recent_payment_total = sum(float(p.amount or 0) for p in recent_payments)
        recent_payment_count = recent_payments.count()

        # ---- Ticket Stats ----
        all_tickets = Ticket.objects.all()
        open_tickets = all_tickets.filter(status='Open').count()
        in_progress_tickets = all_tickets.filter(status='In Progress').count()
        resolved_today = all_tickets.filter(
            status__in=['Resolved', 'Closed'],
            updated_at__date=today
        ).count()

        # ---- Serial Stats ----
        all_serials = GeneticsSerial.objects.all()
        total_serials = all_serials.count()
        active_serials = all_serials.filter(is_active=True).count()

        # ---- Build Report ----
        lines = []
        lines.append("📊 *UA Manager Daily Report*")
        lines.append(f"📅 {today.strftime('%A, %B %d, %Y')}")
        lines.append("")

        # Clients section
        lines.append("👥 *CLIENTS*")
        lines.append(f"  Total: {total_clients}")
        lines.append(f"  ✅ Active: {active_clients}")
        lines.append(f"  ⚠️ Expiring Soon: {expiring_clients}")
        lines.append(f"  ❌ Expired: {expired_clients}")
        lines.append(f"  🧪 Demo: {demo_clients}")

        if expiring_names:
            lines.append("")
            lines.append("⏰ *EXPIRING CLIENTS:*")
            for name in expiring_names[:10]:  # Limit to top 10
                lines.append(name)
            if len(expiring_names) > 10:
                lines.append(f"  ... and {len(expiring_names) - 10} more")

        lines.append("")

        # Invoices section
        lines.append("💰 *INVOICES*")
        lines.append(f"  Total: {total_invoices}")
        lines.append(f"  📌 Due: {due_count} (EGP {due_total:,.0f})")
        lines.append(f"  ✅ Paid: {paid_count} (EGP {paid_total:,.0f})")

        if recent_payment_count > 0:
            lines.append(f"  💵 Last 7 days: {recent_payment_count} payments (EGP {recent_payment_total:,.0f})")

        lines.append("")

        # Tickets section
        lines.append("🎫 *SUPPORT TICKETS*")
        lines.append(f"  🔴 Open: {open_tickets}")
        lines.append(f"  🟡 In Progress: {in_progress_tickets}")
        lines.append(f"  ✅ Resolved Today: {resolved_today}")

        lines.append("")

        # Serials section
        lines.append("🔢 *4GENETICS SERIALS*")
        lines.append(f"  Total: {total_serials}")
        lines.append(f"  Active: {active_serials}")

        lines.append("")
        lines.append("🤖 _Sent by UA Manager Bot_")

        return "\n".join(lines)

    def send_whatsapp(self, phone, apikey, message):
        """Send a WhatsApp message via CallMeBot API."""
        encoded_msg = urllib.parse.quote(message, safe='')
        url = f"https://api.callmebot.com/whatsapp.php?phone={phone}&text={encoded_msg}&apikey={apikey}"

        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=30) as response:
                result = response.read().decode('utf-8', errors='replace')
                self.stdout.write('API response received')
                return response.status == 200
        except urllib.error.HTTPError as e:
            self.stderr.write(f'HTTP Error {e.code}: {e.reason}')
            return False
        except Exception as e:
            self.stderr.write(f'Error sending WhatsApp: {str(e).encode("ascii", "replace").decode()}')
            return False
