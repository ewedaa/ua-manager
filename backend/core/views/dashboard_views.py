from rest_framework import viewsets, filters, views, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.core.mail import EmailMessage
from django.core.files.base import ContentFile
from django.conf import settings
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta
from core.models import (
    Client, LivestockType, Invoice, Payment, Ticket, SubscriptionModule,
    Reminder, GeneticsSerial, ActivityLog, ClientFile, IssueCategory, Contact,
    Todo, Project,
)
from core.serializers import (
    ClientSerializer, ClientDetailSerializer, LivestockTypeSerializer,
    InvoiceSerializer, PaymentSerializer, TicketSerializer, SubscriptionModuleSerializer,
    ReminderSerializer, GeneticsSerialSerializer, ClientFileSerializer, IssueCategorySerializer,
    ContactSerializer, ActivityLogSerializer, TodoSerializer, ProjectSerializer,
)
from core.report_generator import generate_pdf_report, generate_formal_invoice_pdf
try:
    from ai_agent import get_text_suggestion, analyze_file_content
except ImportError:
    def get_text_suggestion(*args, **kwargs): return "AI features are not available."
    def analyze_file_content(*args, **kwargs): return "AI features are not available."
import base64
import os
import uuid


class DashboardStatsView(APIView):
    """API View for fetching dashboard statistics."""
    permission_classes = [AllowAny]

    def get(self, request):
        today = timezone.now().date()

        # Client statistics (exclude legacy 4Genetics colleges)
        base_clients = Client.objects.filter(is_4genetics_college=False)
        total_clients = base_clients.count()
        expiring_count = base_clients.filter(
            subscription_end_date__gte=today,
            subscription_end_date__lte=today + timedelta(days=60)
        ).count()
        expiring_clients = base_clients.filter(
            subscription_end_date__gte=today,
            subscription_end_date__lte=today + timedelta(days=60)
        )
        expired_count = Client.objects.filter(subscription_end_date__lt=today).count()
        
        # Demo farms statistics
        demo_farms = Client.objects.filter(is_demo=True).count()
        demo_expiring_soon = Client.objects.filter(
            is_demo=True,
            demo_end_date__lte=today + timedelta(days=7),
            demo_end_date__gte=today
        ).count()
        
        # Active farms this month
        month_ago = today - timedelta(days=30)
        active_this_month = Client.objects.filter(updated_at__gte=month_ago).count()
        
        # Invoice statistics
        real_invoices = Invoice.objects.exclude(invoice_type__icontains='Quotation')
        total_invoices = real_invoices.count()
        due_invoices = real_invoices.filter(status='Due').count()
        paid_to_us = real_invoices.filter(status='Paid to Us').count()
        paid_to_uniform = real_invoices.filter(status='Paid to Uniform').count()
        
        # Calculate monetary amounts for due invoices
        due_qs = real_invoices.filter(status='Due')
        due_to_4genetics_amount = (
            due_qs.aggregate(total=Sum('customer_total'))['total']
            or due_qs.aggregate(total=Sum('total_amount'))['total']
            or 0.0
        )
        due_to_uniform_amount = real_invoices.filter(status__in=['Due', 'Paid to Us']).aggregate(
            total=Sum('cost_total')
        )['total'] or 0.0
        
        # Total revenue
        total_revenue = real_invoices.filter(status='Paid to Us').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        
        # Ticket statistics
        total_tickets = Ticket.objects.count()
        open_tickets = Ticket.objects.filter(status='Open').count()
        in_progress_tickets = Ticket.objects.filter(status='In Progress').count()
        resolved_tickets = Ticket.objects.filter(status='Resolved').count()
        
        # Average resolution time (for resolved tickets)
        from django.db.models import Avg, F, ExpressionWrapper, DurationField
        resolved_with_time = Ticket.objects.filter(status='Resolved').exclude(
            updated_at__isnull=True
        )
        avg_resolution_hours = None
        if resolved_with_time.exists():
            # Calculate average time from created to updated (resolved)
            total_hours = 0
            count = 0
            for ticket in resolved_with_time[:50]:  # Sample last 50
                delta = ticket.updated_at - ticket.created_at
                total_hours += delta.total_seconds() / 3600
                count += 1
            if count > 0:
                avg_resolution_hours = round(total_hours / count, 1)
        
        # Recent activity - last 7 days
        week_ago = today - timedelta(days=7)
        new_clients_this_week = Client.objects.filter(created_at__gte=week_ago).count()
        new_tickets_this_week = Ticket.objects.filter(created_at__gte=week_ago).count()
        
        # 4Genetics Serials statistics
        total_serials = GeneticsSerial.objects.count()
        active_serials = GeneticsSerial.objects.filter(is_active=True).count()
        unassigned_serials = GeneticsSerial.objects.filter(client__isnull=True, is_active=True).count()
        
        # Get expiring clients details
        expiring_details = [{
            'id': c.id,
            'name': c.name,
            'farm_name': c.farm_name,
            'subscription_end_date': c.subscription_end_date,
            'days_left': (c.subscription_end_date - today).days
        } for c in expiring_clients[:5]]  # Top 5
        
        # Get recent open tickets
        recent_open_tickets = Ticket.objects.filter(status='Open').select_related('client')[:5]
        open_ticket_details = [{
            'id': t.id,
            'client_name': t.client.name,
            'category': t.category,
            'created_at': t.created_at.strftime('%Y-%m-%d'),
            'issue_description': t.issue_description[:50] + '...' if len(t.issue_description) > 50 else t.issue_description
        } for t in recent_open_tickets]
        
        # ── NEW KPIs ──────────────────────────────────
        
        # 1. Client Retention Rate = (non-expired / total) × 100
        active_clients = Client.objects.filter(subscription_end_date__gte=today).count()
        retention_rate = round((active_clients / total_clients * 100), 1) if total_clients > 0 else 0
        
        # 2. Collection Rate = (paid_to_us_amount / total_invoiced_amount) × 100
        total_invoiced_amount = real_invoices.aggregate(total=Sum('total_amount'))['total'] or 0
        collection_rate = round((float(total_revenue) / float(total_invoiced_amount) * 100), 1) if total_invoiced_amount > 0 else 0
        
        # 3. SLA Adherence = (resolved within 48h / total resolved) × 100
        resolved_tickets_qs = Ticket.objects.filter(status__in=['Resolved', 'Closed'])
        total_resolved_count = resolved_tickets_qs.count()
        resolved_within_sla = 0
        if total_resolved_count > 0:
            for ticket in resolved_tickets_qs[:100]:
                delta = ticket.updated_at - ticket.created_at
                if delta.total_seconds() <= 48 * 3600:
                    resolved_within_sla += 1
            sla_adherence = round((resolved_within_sla / min(total_resolved_count, 100) * 100), 1)
        else:
            sla_adherence = 100.0
        
        # 4. Avg Open Ticket Age (in days)
        open_tickets_qs = Ticket.objects.filter(status__in=['Open', 'In Progress'])
        avg_ticket_age_days = None
        if open_tickets_qs.exists():
            total_age = sum((timezone.now() - t.created_at).total_seconds() / 86400 for t in open_tickets_qs[:50])
            avg_ticket_age_days = round(total_age / min(open_tickets_qs.count(), 50), 1)
        
        # 5. Revenue Per Active Client
        revenue_per_client = round(float(total_revenue) / active_clients, 0) if active_clients > 0 else 0
        
        # 6. Monthly Burn Rate (outbound payments this month)
        first_of_month = today.replace(day=1)
        monthly_burn = Payment.objects.filter(
            direction='Outbound',
            date__gte=first_of_month
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        return Response({
            'clients': {
                'total': total_clients,
                'active': active_clients,
                'expiring_soon': expiring_count,
                'expired': expired_count,
                'new_this_week': new_clients_this_week,
                'expiring_details': expiring_details,
                'demo_farms': demo_farms,
                'demo_expiring_soon': demo_expiring_soon,
                'active_this_month': active_this_month
            },
            'invoices': {
                'total': total_invoices,
                'due': due_invoices,
                'paid_to_us': paid_to_us,
                'paid_to_uniform': paid_to_uniform,
                'due_to_4genetics_amount': float(due_to_4genetics_amount),
                'due_to_uniform_amount': float(due_to_uniform_amount),
                'total_revenue': float(total_revenue)
            },
            'tickets': {
                'total': total_tickets,
                'open': open_tickets,
                'in_progress': in_progress_tickets,
                'resolved': resolved_tickets,
                'new_this_week': new_tickets_this_week,
                'recent_open': open_ticket_details,
                'avg_resolution_hours': avg_resolution_hours
            },
            'serials': {
                'total': total_serials,
                'active': active_serials,
                'unassigned': unassigned_serials
            },
            'kpis': {
                'retention_rate': retention_rate,
                'collection_rate': collection_rate,
                'sla_adherence': sla_adherence,
                'avg_ticket_age_days': avg_ticket_age_days,
                'revenue_per_client': float(revenue_per_client),
                'monthly_burn_rate': float(monthly_burn),
            }
        })


class ChartDataView(APIView):
    """API View for fetching chart/trend data for dashboard."""
    permission_classes = [AllowAny]

    def get(self, request):
        from django.db.models.functions import TruncMonth, ExtractQuarter
        from collections import defaultdict

        today = timezone.now().date()
        six_months_ago = today - timedelta(days=180)
        
        # Ticket trends by month
        tickets_by_month = Ticket.objects.filter(
            created_at__gte=six_months_ago
        ).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            count=Count('id')
        ).order_by('month')
        
        ticket_trend = [
            {'month': t['month'].strftime('%b %Y'), 'count': t['count']}
            for t in tickets_by_month
        ]
        
        # Ticket status distribution
        ticket_status = list(Ticket.objects.values('status').annotate(
            count=Count('id')
        ))
        
        # Ticket category distribution
        ticket_categories = list(Ticket.objects.values('category').annotate(
            count=Count('id')
        ))
        
        # Invoice trends by month
        real_invoices = Invoice.objects.exclude(invoice_type__icontains='Quotation')
        invoices_by_month = real_invoices.filter(
            created_at__gte=six_months_ago
        ).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            count=Count('id'),
        ).order_by('month')
        
        invoice_trend = []
        for inv in invoices_by_month:
            # Get revenue for this month
            month_revenue = real_invoices.filter(
                created_at__year=inv['month'].year,
                created_at__month=inv['month'].month,
                status='Paid to Us'
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            
            invoice_trend.append({
                'month': inv['month'].strftime('%b %Y'),
                'count': inv['count'],
                'revenue': float(month_revenue)
            })
        
        # Invoice status distribution
        invoice_status = list(real_invoices.values('status').annotate(
            count=Count('id')
        ))
        
        # Subscription health - active vs expiring vs expired (all DB-level)
        active_subs = Client.objects.filter(
            subscription_end_date__gt=today + timedelta(days=60)
        ).count()
        expiring_subs = Client.objects.filter(
            subscription_end_date__gte=today,
            subscription_end_date__lte=today + timedelta(days=60)
        ).count()
        expired_subs = Client.objects.filter(subscription_end_date__lt=today).count()
        
        subscription_health = [
            {'name': 'Active', 'value': active_subs, 'color': '#22c55e'},
            {'name': 'Expiring Soon', 'value': expiring_subs, 'color': '#f59e0b'},
            {'name': 'Expired', 'value': expired_subs, 'color': '#ef4444'},
        ]
        
        # Quarterly projections for Uniform Dues (Current Year)
        current_year = today.year
        quarterly_dues = []
        for q in range(1, 5):
            # Calculate sum of dues for each quarter
            # We assume 'Due' and 'Paid to Us' status implies money flows involved that are relevant
            dues = real_invoices.filter(
                created_at__year=current_year,
                status__in=['Due', 'Paid to Us']
            ).annotate(
                quarter=ExtractQuarter('created_at')
            ).filter(
                quarter=q
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            
            quarterly_dues.append({
                'name': f'Q{q}',
                'value': float(dues)
            })
        
        # Recent tickets for table
        recent_tickets = Ticket.objects.select_related('client').order_by('-created_at')[:10]
        tickets_table = [{
            'id': t.id,
            'client': t.client.farm_name,
            'category': t.category,
            'status': t.status,
            'issue': t.issue_description[:40] + '...' if len(t.issue_description) > 40 else t.issue_description,
            'date': t.created_at.strftime('%Y-%m-%d')
        } for t in recent_tickets]
        
        # Upcoming renewals
        upcoming_renewals = Client.objects.filter(
            subscription_end_date__gte=today,
            subscription_end_date__lte=today + timedelta(days=90)
        ).order_by('subscription_end_date')[:10]
        
        renewals_table = [{
            'id': c.id,
            'farm': c.farm_name,
            'contact': c.name,
            'end_date': c.subscription_end_date.strftime('%Y-%m-%d'),
            'days_left': (c.subscription_end_date - today).days
        } for c in upcoming_renewals]
        
        return Response({
            'ticket_trend': ticket_trend,
            'ticket_status': ticket_status,
            'ticket_categories': ticket_categories,
            'invoice_trend': invoice_trend,
            'invoice_status': invoice_status,
            'subscription_health': subscription_health,
            'tickets_table': tickets_table,
            'renewals_table': renewals_table,
            'quarterly_dues': quarterly_dues
        })


