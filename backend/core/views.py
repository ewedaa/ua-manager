from rest_framework import viewsets, filters, views, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.core.mail import EmailMessage
from .models import Client, LivestockType, Invoice, Payment, Ticket, SubscriptionModule, Reminder, GeneticsSerial, ActivityLog, ClientFile, IssueCategory, Contact
from .serializers import (
    ClientSerializer, ClientDetailSerializer, LivestockTypeSerializer,
    InvoiceSerializer, PaymentSerializer, TicketSerializer, SubscriptionModuleSerializer,
    ReminderSerializer, GeneticsSerialSerializer, ClientFileSerializer, IssueCategorySerializer, ContactSerializer
)
from .report_generator import generate_pdf_report, generate_formal_invoice_pdf
try:
    from ai_agent import get_text_suggestion, analyze_file_content
except ImportError:
    def get_text_suggestion(*args, **kwargs): return "AI features are not available."
    def analyze_file_content(*args, **kwargs): return "AI features are not available."
import base64
import os
import uuid


class ClientViewSet(viewsets.ModelViewSet):
    """ViewSet for Client CRUD operations."""
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'farm_name', 'phone']
    ordering_fields = ['name', 'subscription_end_date', 'created_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ClientDetailSerializer
        return ClientSerializer

    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """Get all clients with subscriptions expiring within 60 days."""
        expiring_clients = [c for c in self.queryset if c.is_expiring_soon]
        serializer = self.get_serializer(expiring_clients, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        instance = serializer.save()
        ActivityLog.log('client_created', f'Client "{instance.farm_name}" was created', 'client', instance.id)
        
        if instance.is_4genetics_college:
            GeneticsSerial.objects.create(
                client=instance,
                serial_number=f"4GEN-{instance.id}-{uuid.uuid4().hex[:6].upper()}",
                product_type='Other',
                is_active=True,
                notes="Auto-created from 4Genetics College designation"
            )

    def perform_update(self, serializer):
        instance = serializer.save()
        ActivityLog.log('client_updated', f'Client "{instance.farm_name}" was updated', 'client', instance.id)


class LivestockTypeViewSet(viewsets.ModelViewSet):
    """ViewSet for LivestockType CRUD operations."""
    queryset = LivestockType.objects.all()
    serializer_class = LivestockTypeSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    """ViewSet for Invoice CRUD operations."""
    queryset = Invoice.objects.select_related('client').prefetch_related('livestock_selection', 'payments')
    serializer_class = InvoiceSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['client__name', 'client__farm_name']
    ordering_fields = ['created_at', 'total_amount', 'status']

    @action(detail=False, methods=['get'])
    def by_status(self, request):
        """Filter invoices by status."""
        status = request.query_params.get('status', None)
        if status:
            invoices = self.queryset.filter(status=status)
        else:
            invoices = self.queryset
        serializer = self.get_serializer(invoices, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        instance = serializer.save()
        ActivityLog.log('invoice_created', f'Invoice #{instance.id} created for "{instance.client.farm_name}"', 'invoice', instance.id)

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.status == 'Paid to Us':
            ActivityLog.log('invoice_paid', f'Invoice #{instance.id} marked as paid', 'invoice', instance.id)

    @action(detail=False, methods=['get'])
    def live_exchange_rate(self, request):
        """Fetch the live EUR→EGP exchange rate. Tries multiple free APIs in sequence."""
        import requests as http_requests
        from decimal import Decimal

        FALLBACK_RATE = 57.50   # reasonable EUR→EGP fallback
        TIMEOUT = 7

        def _try_frankfurter():
            resp = http_requests.get(
                'https://api.frankfurter.app/latest?from=EUR&to=EGP',
                timeout=TIMEOUT
            )
            d = resp.json()
            return float(Decimal(str(d['rates']['EGP'])).quantize(Decimal('0.0001'))), d.get('date', '')

        def _try_exchangerate_host():
            resp = http_requests.get(
                'https://open.er-api.com/v6/latest/EUR',
                timeout=TIMEOUT
            )
            d = resp.json()
            rate = d['rates']['EGP']
            return float(Decimal(str(rate)).quantize(Decimal('0.0001'))), d.get('time_last_update_utc', '')[:10]

        def _try_fixer_free():
            resp = http_requests.get(
                'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json',
                timeout=TIMEOUT
            )
            d = resp.json()
            rate = d['eur']['egp']
            return float(Decimal(str(rate)).quantize(Decimal('0.0001'))), ''

        for fn in [_try_frankfurter, _try_exchangerate_host, _try_fixer_free]:
            try:
                rate, date = fn()
                return Response({
                    'rate': rate,
                    'from': 'EUR',
                    'to': 'EGP',
                    'date': date,
                    'is_fallback': False,
                })
            except Exception:
                continue

        # All APIs failed — return hardcoded fallback so the user can still work
        return Response({
            'rate': FALLBACK_RATE,
            'from': 'EUR',
            'to': 'EGP',
            'date': '',
            'is_fallback': True,
        })

    @action(detail=True, methods=['post'])
    def generate_pdf(self, request, pk=None):
        """Generate a formal, professional customer-facing PDF for this invoice."""
        from django.core.files.base import ContentFile

        invoice = self.get_object()

        try:
            buffer = generate_formal_invoice_pdf(invoice)
            filename = f"invoice_{invoice.id}.pdf"
            if invoice.pdf_file:
                invoice.pdf_file.delete(save=False)
            invoice.pdf_file.save(filename, ContentFile(buffer.getvalue()), save=True)
            return Response({'pdf_url': invoice.pdf_file.url, 'message': 'PDF Generated Successfully'})
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['post'])
    def generate_internal_pdf(self, request, pk=None):
        """Generate an INTERNAL PDF with full cost breakdown (what we owe Uniform) for 4Genetics."""
        from django.core.files.base import ContentFile
        from decimal import Decimal

        invoice = self.get_object()
        is_renewal = invoice.invoice_type == 'Renewal Invoice'
        is_dairylive = getattr(invoice, 'is_dairylive', False)

        def get_cost(mod):
            return mod.renewal_price if is_renewal else mod.purchase_price

        def get_customer_price(mod):
            if is_renewal:
                return mod.renewal_customer_price
            price = mod.purchase_customer_price
            if is_dairylive:
                price = (price * Decimal('0.5')).quantize(Decimal('0.01'))
            return price

        doc_title = invoice.invoice_type or 'Invoice'
        lines = [
            f"# INTERNAL {doc_title.upper()} #{invoice.id}",
            f"**Date:** {invoice.created_at.strftime('%Y-%m-%d')}",
            f"**Client:** {invoice.client.farm_name}",
            f"**Contact:** {invoice.client.name}",
            "",
            "## Details",
            f"- **Type:** {invoice.invoice_type}",
            f"- **Status:** {invoice.status}",
            f"- **Price Mode:** {'Renewal' if is_renewal else 'Purchase'}",
        ]

        if is_dairylive and not is_renewal:
            lines.append("- **DairyLive Discount:** YES — 50% off customer price")

        lines.append("")

        # Modules with cost AND customer price side-by-side
        modules = invoice.selected_modules.all()
        if modules.exists():
            lines.extend([
                "## Modules Breakdown",
                "| Module | Cost (→ Uniform) | Customer Price (← Farm) | Margin |",
                "|---|---|---|---|",
            ])
            for mod in modules:
                cost = get_cost(mod)
                cust = get_customer_price(mod)
                margin = cust - cost
                lines.append(f"| {mod.name} | {cost} EGP | {cust} EGP | +{margin} EGP |")
            lines.append("")

        # Livestock
        livestock = invoice.livestock_selection.all()
        if livestock.exists():
            lines.extend([
                "## Livestock",
                "| Item | Multiplier |",
                "|---|---|",
            ])
            for item in livestock:
                lines.append(f"| {item.name} | x{item.price_multiplier} |")
            lines.append("")

        # Full pricing breakdown
        cost = invoice.cost_total or 0
        customer = invoice.customer_total or invoice.total_amount
        profit = float(str(customer)) - float(str(cost))

        lines.extend([
            "## Financial Summary",
            f"- **💸 Due to Uniform Agri (our cost):** {cost} EGP",
            f"- **💰 Due from Farm (customer price):** {customer} EGP",
            f"- **📈 Your Profit:** +{profit:.2f} EGP",
            "",
        ])

        if invoice.notes:
            lines.extend(["## Notes", invoice.notes, ""])

        lines.extend([
            "---",
            "*Internal Document — Not for Customer Distribution*",
            "**4Genetics**",
        ])

        content = "\n".join(lines)

        try:
            buffer = generate_pdf_report(content, title=f"Internal {doc_title} #{invoice.id}")
            filename = f"invoice_{invoice.id}_internal.pdf"
            from django.core.files.storage import default_storage
            if default_storage.exists(f'invoices/{filename}'):
                default_storage.delete(f'invoices/{filename}')
            path = default_storage.save(f'invoices/{filename}', ContentFile(buffer.getvalue()))
            pdf_url = default_storage.url(path)
            return Response({'pdf_url': pdf_url, 'message': 'Internal PDF Generated'})
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class PaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for Payment CRUD operations."""
    queryset = Payment.objects.select_related('invoice', 'invoice__client')
    serializer_class = PaymentSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['date', 'amount']


class TicketViewSet(viewsets.ModelViewSet):
    """ViewSet for Ticket CRUD operations."""
    queryset = Ticket.objects.select_related('client')
    serializer_class = TicketSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['client__name', 'issue_description', 'category']
    ordering_fields = ['created_at', 'status', 'category']

    @action(detail=False, methods=['get'])
    def open_tickets(self, request):
        """Get all open tickets."""
        open_tickets = self.queryset.filter(status='Open')
        serializer = self.get_serializer(open_tickets, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        instance = serializer.save()
        ActivityLog.log('ticket_created', f'Ticket #{instance.id} opened for "{instance.client.name}"', 'ticket', instance.id)

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.status == 'Resolved':
            ActivityLog.log('ticket_resolved', f'Ticket #{instance.id} resolved', 'ticket', instance.id)


class SubscriptionModuleViewSet(viewsets.ModelViewSet):
    """ViewSet for managing subscription modules (full CRUD)."""
    queryset = SubscriptionModule.objects.all()
    serializer_class = SubscriptionModuleSerializer


class IssueCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for managing issue categories (full CRUD)."""
    queryset = IssueCategory.objects.all()
    serializer_class = IssueCategorySerializer


class GeneticsSerialViewSet(viewsets.ModelViewSet):
    """ViewSet for 4Genetics Serial CRUD operations."""
    queryset = GeneticsSerial.objects.select_related('client').all()
    serializer_class = GeneticsSerialSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['serial_number', 'product_type', 'college_name']
    ordering_fields = ['created_at', 'serial_number', 'product_type']


class ClientFileViewSet(viewsets.ModelViewSet):
    """Upload, list, and delete files for a client."""
    serializer_class = ClientFileSerializer
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        return ClientFile.objects.filter(client_id=self.kwargs.get('client_pk'))

    def perform_create(self, serializer):
        client = Client.objects.get(pk=self.kwargs['client_pk'])
        uploaded = self.request.FILES.get('file')
        serializer.save(
            client=client,
            original_name=uploaded.name,
            file_size=uploaded.size
        )

    def perform_destroy(self, instance):
        # Remove file from disk then delete the DB record
        instance.file.delete(save=False)
        instance.delete()


class ClientContactView(views.APIView):
    """Create and list contacts for a client."""
    def get(self, request, client_pk):
        contacts = Contact.objects.filter(client_id=client_pk)
        serializer = ContactSerializer(contacts, many=True)
        return Response(serializer.data)

    def post(self, request, client_pk):
        try:
            client = Client.objects.get(pk=client_pk)
        except Client.DoesNotExist:
            return Response({'detail': 'Client not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ContactSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(client=client)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum, Count


class DashboardStatsView(APIView):
    """API View for fetching dashboard statistics."""
    permission_classes = [AllowAny]

    def get(self, request):
        from .models import Client, Invoice, Ticket, Payment, GeneticsSerial
        
        # Client statistics (exclude legacy 4Genetics colleges)
        base_clients = Client.objects.filter(is_4genetics_college=False)
        total_clients = base_clients.count()
        expiring_clients = [c for c in base_clients if c.is_expiring_soon]
        expiring_count = len(expiring_clients)
        
        # Expired clients (subscription end date has passed)
        today = timezone.now().date()
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
        total_invoices = Invoice.objects.count()
        due_invoices = Invoice.objects.filter(status='Due').count()
        paid_to_us = Invoice.objects.filter(status='Paid to Us').count()
        paid_to_uniform = Invoice.objects.filter(status='Paid to Uniform').count()
        
        # Total revenue
        total_revenue = Invoice.objects.filter(status='Paid to Us').aggregate(
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
        total_invoiced_amount = Invoice.objects.aggregate(total=Sum('total_amount'))['total'] or 0
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
        from .models import Client, Invoice, Ticket
        from django.db.models.functions import TruncMonth, ExtractQuarter
        from django.db.models import Count
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
        invoices_by_month = Invoice.objects.filter(
            created_at__gte=six_months_ago
        ).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            count=Count('id'),
        ).order_by('month')
        
        invoice_trend = []
        for inv in invoices_by_month:
            # Get revenue for this month
            month_revenue = Invoice.objects.filter(
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
        invoice_status = list(Invoice.objects.values('status').annotate(
            count=Count('id')
        ))
        
        # Subscription health - active vs expiring vs expired
        active_subs = Client.objects.filter(
            subscription_end_date__gt=today + timedelta(days=60)
        ).count()
        expiring_subs = len([c for c in Client.objects.all() if c.is_expiring_soon])
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
            dues = Invoice.objects.filter(
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


class AgentQueryView(APIView):
    """API View for querying the AI Agent."""
    permission_classes = [AllowAny]  # Adjust as needed

    def post(self, request):
        try:
            # Import here to avoid circular imports or early loading issues
            # assuming ai_agent.py is in the project root
            from ai_agent import ask_uniform_agri_agent
            
            question = request.data.get('question')
            if not question:
                return Response({'error': 'No question provided'}, status=400)
            
            response_data = ask_uniform_agri_agent(question, context=request.data.get('context'))
            # response_data is now a dict { "answer": ..., "action": ... }
            return Response(response_data)
        except ImportError as e:
             return Response({'error': f'ImportError: {str(e)}'}, status=500)
        except Exception as e:
            return Response({'error': f'Exception: {str(e)}'}, status=500)


class NotificationsView(APIView):
    """API View for managing notifications/reminders."""
    permission_classes = [AllowAny]

    def get(self, request):
        """Get all active (non-dismissed) notifications."""
        # Auto-generate reminders on each fetch
        Reminder.generate_auto_reminders()
        
        # Get query params for filtering
        unread_only = request.query_params.get('unread', 'false').lower() == 'true'
        reminder_type = request.query_params.get('type', None)
        
        notifications = Reminder.objects.filter(is_dismissed=False)
        
        # Filter out currently snoozed notifications
        now = timezone.now()
        notifications = notifications.exclude(
            snoozed_until__isnull=False,
            snoozed_until__gt=now
        )
        
        if unread_only:
            notifications = notifications.filter(is_read=False)
        if reminder_type:
            notifications = notifications.filter(reminder_type=reminder_type)
        
        # Order by priority (urgent first) and due date
        priority_order = {'urgent': 0, 'high': 1, 'medium': 2, 'low': 3}
        notifications = sorted(
            notifications,
            key=lambda x: (priority_order.get(x.priority, 4), x.due_date)
        )
        
        serializer = ReminderSerializer(notifications, many=True)
        
        # Get counts
        total = Reminder.objects.filter(is_dismissed=False).count()
        unread = Reminder.objects.filter(is_dismissed=False, is_read=False).count()
        
        return Response({
            'notifications': serializer.data,
            'total': total,
            'unread': unread
        })

    def post(self, request):
        """Create a new custom reminder."""
        serializer = ReminderSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def patch(self, request, pk=None):
        """Update a reminder (mark read, dismiss, etc.)."""
        try:
            reminder = Reminder.objects.get(pk=pk)
        except Reminder.DoesNotExist:
            return Response({'error': 'Reminder not found'}, status=404)
        
        serializer = ReminderSerializer(reminder, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk=None):
        """Delete a reminder."""
        try:
            reminder = Reminder.objects.get(pk=pk)
            reminder.delete()
            return Response({'message': 'Reminder deleted'}, status=204)
        except Reminder.DoesNotExist:
            return Response({'error': 'Reminder not found'}, status=404)


class MarkAllNotificationsReadView(APIView):
    """Mark all notifications as read."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        count = Reminder.objects.filter(is_dismissed=False, is_read=False).update(is_read=True)
        return Response({'message': f'Marked {count} notifications as read'})


class DismissAllNotificationsView(APIView):
    """Dismiss all notifications."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        count = Reminder.objects.filter(is_dismissed=False).update(is_dismissed=True)
        return Response({'message': f'Dismissed {count} notifications'})


class EmailReportView(views.APIView):
    """
    Receives chat content and target email.
    Generates a PDF and sends it via email.
    """
    def post(self, request):
        email = request.data.get('email')
        content = request.data.get('content')
        title = request.data.get('title', 'Uniform Agri Insight')

        if not email or not content:
            return Response({"error": "Email and content are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Generate PDF
            pdf_buffer = generate_pdf_report(content, title)
            
            # Create Email
            mail = EmailMessage(
                subject=f"Your Farm Report: {title}",
                body="Please find attached the report generated by your Uniform Agri Farm Assistant.",
                from_email='bot@uniform-agri.com',
                to=[email],
            )
            
            # Attach PDF
            mail.attach('report.pdf', pdf_buffer.getvalue(), 'application/pdf')
            
            # Send
            mail.send()
            
            return Response({"message": "Email sent successfully!"})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AISuggestionView(views.APIView):
    """
    Suggests text for a given field context.
    """
    def post(self, request):
        field_name = request.data.get('field_name', 'Input')
        current_text = request.data.get('current_text', '')
        context = request.data.get('context', '')
        
        suggestion = get_text_suggestion(field_name, current_text, context)
        return Response({'suggestion': suggestion})

class FileAnalysisView(views.APIView):
    """
    Analyzes uploaded files (images).
    """
    def post(self, request):
        prompt = request.data.get('prompt', 'Describe this file.')
        uploaded_file = request.FILES.get('file')
        
        if not uploaded_file:
            return Response({'error': 'No file uploaded'}, status=400)
            
        try:
            # Read file bytes
            file_bytes = uploaded_file.read()
            mime_type = uploaded_file.content_type
            
            # Base64 encode for simple passing to our agent helper
            # or pass bytes if agent handles it. Our agent helper expects base64 string in data url format?
            # Actually, let's adjust agent helper or encode here.
            # Agent expects: data:{mime_type};base64,{file_bytes}
            # So we need to b64encode the bytes.
            b64_data = base64.b64encode(file_bytes).decode('utf-8')
            
            analysis = analyze_file_content(b64_data, mime_type, prompt)
            return Response({'analysis': analysis})
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class InsightsView(views.APIView):
    """
    Generates a strategic business report using AI.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            from ai_agent import generate_business_report
            report = generate_business_report()
            return Response({'report': report})
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class ActivityLogView(APIView):
    """API View for recent activity feed."""
    permission_classes = [AllowAny]

    def get(self, request):
        from .models import ActivityLog
        from .serializers import ActivityLogSerializer
        
        limit = int(request.query_params.get('limit', 20))
        logs = ActivityLog.objects.all()[:limit]
        serializer = ActivityLogSerializer(logs, many=True)
        return Response({'activities': serializer.data})


class TodoView(APIView):
    """API View for todo/task management."""
    permission_classes = [AllowAny]

    def get(self, request):
        from .models import Todo
        from .serializers import TodoSerializer
        
        filter_status = request.query_params.get('status', 'all')
        todos = Todo.objects.all()
        
        if filter_status == 'active':
            todos = todos.filter(is_done=False)
        elif filter_status == 'completed':
            todos = todos.filter(is_done=True)
        
        serializer = TodoSerializer(todos, many=True)
        return Response({'todos': serializer.data})

    def post(self, request):
        from .serializers import TodoSerializer
        
        serializer = TodoSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def patch(self, request, pk=None):
        from .models import Todo
        from .serializers import TodoSerializer
        
        if not pk:
            return Response({'error': 'Todo ID required'}, status=400)
        
        try:
            todo = Todo.objects.get(pk=pk)
        except Todo.DoesNotExist:
            return Response({'error': 'Todo not found'}, status=404)
        
        serializer = TodoSerializer(todo, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk=None):
        from .models import Todo
        
        if not pk:
            return Response({'error': 'Todo ID required'}, status=400)
        
        try:
            todo = Todo.objects.get(pk=pk)
            todo.delete()
            return Response({'success': True})
        except Todo.DoesNotExist:
            return Response({'error': 'Todo not found'}, status=404)


class ProjectViewSet(viewsets.ModelViewSet):
    """ViewSet for Project CRUD operations."""
    from .models import Project
    from .serializers import ProjectSerializer
    
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'status']

    def perform_create(self, serializer):
        instance = serializer.save()
        # Log activity
        try:
            from .models import ActivityLog
            ActivityLog.log('project_created', f'Project "{instance.name}" was created', 'project', instance.id)
        except:
            pass



from django.core.files.base import ContentFile
import os
from django.conf import settings
import uuid

class BusinessReportView(APIView):
    """
    Generates a PDF Business Report and returns the URL.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from .models import Client, Invoice, Ticket
        from django.db.models import Sum
        from django.utils import timezone
        
        today = timezone.now().date()
        total_clients = Client.objects.count()
        active_clients = Client.objects.filter(subscription_end_date__gte=today).count()
        
        total_revenue = Invoice.objects.filter(status='Paid to Us').aggregate(
            total=Sum('total_amount'))['total'] or 0
            
        open_tickets = Ticket.objects.filter(status='Open').count()
        
        # Build Markdown
        content = f"""
# Uniform Agri Business Report
**Generated on:** {today.strftime('%Y-%m-%d')}

## Executive Summary
This report contains a top-level overview of the Uniform Agri system operations.

### Key Performance Indicators
- **Total Farms (Clients):** {total_clients}
- **Active Farms:** {active_clients}
- **Total Revenue Collected:** {total_revenue} EGP
- **Pending Open Tickets:** {open_tickets}

## Financial Status
| Description | Amount |
|---|---|
| Collected Revenue | {total_revenue} EGP |

## Action Items
- Follow up on the {open_tickets} open support tickets.
- Ensure expiring clients are contacted.

---
*Report generated automatically by UA Manager Analytics Engine.*
"""
        
        try:
            from .report_generator import generate_pdf_report
            pdf_buffer = generate_pdf_report(content, title="Business Analytics Report")
            
            # Save the file to media so it can be downloaded
            filename = f"business_report_{uuid.uuid4().hex[:8]}.pdf"
            reports_dir = os.path.join(settings.MEDIA_ROOT, 'reports')
            os.makedirs(reports_dir, exist_ok=True)
            
            filepath = os.path.join(reports_dir, filename)
            with open(filepath, 'wb') as f:
                f.write(pdf_buffer.getvalue())
                
            file_url = request.build_absolute_uri(settings.MEDIA_URL + f"reports/{filename}")
            return Response({'pdf_url': file_url})
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class AITicketDraftView(APIView):
    """Drafts a ticket reply using AI."""
    permission_classes = [AllowAny]
    def post(self, request):
        description = request.data.get('description', '')
        if not description:
            return Response({'error': 'No description provided'}, status=400)
        try:
            from ai_agent import generate_ticket_response
            draft = generate_ticket_response(description)
            return Response({'draft': draft})
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class AIClientSummaryView(APIView):
    """Summarizes a client profile using AI."""
    permission_classes = [AllowAny]
    def post(self, request):
        client_id = request.data.get('client_id')
        if not client_id:
            return Response({'error': 'No client_id provided'}, status=400)
        try:
            from ai_agent import summarize_client_profile
            summary = summarize_client_profile(client_id)
            return Response({'summary': summary})
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class CustomReportView(views.APIView):
    """
    Accepts arbitrary markdown content and a title to generate a styled PDF report.
    Returns the URL to the generated PDF.
    """
    def post(self, request):
        from datetime import datetime as _dt
        _now = _dt.now()
        _default_title = f'Custom Report — {_now.strftime("%B %Y")}'
        title = request.data.get('title', _default_title)
        content = request.data.get('content')
        
        if not content:
            return Response({"error": "Content is required to generate a report."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pdf_buffer = generate_pdf_report(content, title=title)
            
            # Save the file to media so it can be downloaded
            filename = f"custom_report_{uuid.uuid4().hex[:8]}.pdf"
            reports_dir = os.path.join(settings.MEDIA_ROOT, 'reports')
            os.makedirs(reports_dir, exist_ok=True)
            
            filepath = os.path.join(reports_dir, filename)
            with open(filepath, 'wb') as f:
                f.write(pdf_buffer.getvalue())
                
            file_url = request.build_absolute_uri(settings.MEDIA_URL + f"reports/{filename}")
            return Response({'pdf_url': file_url})
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class ReportBuilderView(views.APIView):
    """
    Data-driven report builder. Accepts selected modules + filters,
    queries real data, formats into markdown tables, and generates PDF.
    
    POST body:
    {
        "title": "My Report",
        "modules": [
            { "key": "clients", "filters": { "status": "active", ... } },
            { "key": "invoices", "filters": { "status": "Due", "date_from": "2025-01-01" } },
            ...
        ]
    }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from .models import Client, Invoice, Ticket, Payment, GeneticsSerial, Project
        from django.utils import timezone
        from datetime import datetime

        from datetime import datetime as _dt
        _now = _dt.now()
        _mods = request.data.get('modules', [])
        _mod_names = [m.get('key', '').replace('_', ' ').title() for m in _mods]
        _default_title = (', '.join(_mod_names) + f' Report — {_now.strftime("%B %Y")}') if _mod_names else f'Business Report — {_now.strftime("%B %Y")}'
        title = request.data.get('title') or _default_title
        modules = request.data.get('modules', [])

        if not modules:
            return Response({'error': 'At least one module must be selected.'}, status=400)

        sections = []
        summary_stats = {}

        for mod in modules:
            key = mod.get('key')
            filters = mod.get('filters', {})

            if key == 'clients':
                qs = Client.objects.all()
                today = timezone.now().date()

                fstatus = filters.get('status')
                if fstatus == 'active':
                    qs = qs.filter(subscription_end_date__gte=today)
                elif fstatus == 'expired':
                    qs = qs.filter(subscription_end_date__lt=today)
                elif fstatus == 'expiring':
                    qs = qs.filter(
                        subscription_end_date__gte=today,
                        subscription_end_date__lte=today + timedelta(days=60)
                    )
                if filters.get('demo_only'):
                    qs = qs.filter(is_demo=True)
                if filters.get('livestock_type'):
                    qs = qs.filter(livestock_type=filters['livestock_type'])

                rows = []
                for c in qs:
                    end = c.subscription_end_date
                    stat = 'Active' if end and end >= today else 'Expired'
                    rows.append([c.name, c.farm_name, c.phone or '-', str(end) if end else '-', stat, getattr(c, 'livestock_type', '-')])

                summary_stats['Total Clients'] = len(rows)
                header = '| Name | Farm | Phone | Subscription End | Status | Livestock |\n|---|---|---|---|---|---|\n'
                body = '\n'.join([f'| {" | ".join(map(str, r))} |' for r in rows]) if rows else '| No data | | | | | |'
                sections.append(f'## Clients\n\n{header}{body}\n')

            elif key == 'invoices':
                qs = Invoice.objects.select_related('client').all()

                if filters.get('status'):
                    qs = qs.filter(status=filters['status'])
                if filters.get('type'):
                    qs = qs.filter(invoice_type=filters['type'])
                if filters.get('date_from'):
                    qs = qs.filter(created_at__date__gte=filters['date_from'])
                if filters.get('date_to'):
                    qs = qs.filter(created_at__date__lte=filters['date_to'])

                rows = []
                total_amount = 0
                for inv in qs:
                    amt = float(inv.total_amount or 0)
                    total_amount += amt
                    rows.append([
                        inv.client.name if inv.client else '-',
                        inv.invoice_type or '-',
                        f'${amt:,.2f}',
                        inv.status or '-',
                        str(inv.created_at.date()) if inv.created_at else '-'
                    ])

                summary_stats['Total Invoices'] = len(rows)
                summary_stats['Total Amount'] = f'${total_amount:,.2f}'
                header = '| Client | Type | Amount | Status | Date |\n|---|---|---|---|---|\n'
                body = '\n'.join([f'| {" | ".join(r)} |' for r in rows]) if rows else '| No data | | | | |'
                sections.append(f'## Invoices\n\n{header}{body}\n')

            elif key == 'tickets':
                qs = Ticket.objects.select_related('client').all()

                if filters.get('status'):
                    qs = qs.filter(status=filters['status'])
                if filters.get('category'):
                    qs = qs.filter(category=filters['category'])
                if filters.get('date_from'):
                    qs = qs.filter(created_at__date__gte=filters['date_from'])
                if filters.get('date_to'):
                    qs = qs.filter(created_at__date__lte=filters['date_to'])

                rows = []
                for t in qs:
                    desc = t.issue_description[:60] + '...' if len(t.issue_description) > 60 else t.issue_description
                    rows.append([
                        t.client.name if t.client else '-',
                        t.category or '-',
                        t.status or '-',
                        desc,
                        str(t.created_at.date()) if t.created_at else '-'
                    ])

                summary_stats['Total Tickets'] = len(rows)
                header = '| Client | Category | Status | Description | Date |\n|---|---|---|---|---|\n'
                body = '\n'.join([f'| {" | ".join(r)} |' for r in rows]) if rows else '| No data | | | | |'
                sections.append(f'## Tickets\n\n{header}{body}\n')

            elif key == 'payments':
                qs = Payment.objects.select_related('invoice', 'invoice__client').all()

                if filters.get('direction'):
                    qs = qs.filter(direction=filters['direction'])
                if filters.get('date_from'):
                    qs = qs.filter(date__gte=filters['date_from'])
                if filters.get('date_to'):
                    qs = qs.filter(date__lte=filters['date_to'])

                rows = []
                total_paid = 0
                for p in qs:
                    amt = float(p.amount or 0)
                    total_paid += amt
                    client_name = p.invoice.client.name if p.invoice and p.invoice.client else '-'
                    rows.append([
                        client_name,
                        f'${amt:,.2f}',
                        p.direction or '-',
                        str(p.date) if p.date else '-'
                    ])

                summary_stats['Total Payments'] = len(rows)
                summary_stats['Total Paid'] = f'${total_paid:,.2f}'
                header = '| Client | Amount | Direction | Date |\n|---|---|---|---|\n'
                body = '\n'.join([f'| {" | ".join(r)} |' for r in rows]) if rows else '| No data | | | |'
                sections.append(f'## Payments\n\n{header}{body}\n')

            elif key == 'serials':
                qs = GeneticsSerial.objects.select_related('client').all()

                if filters.get('product_type'):
                    qs = qs.filter(product_type=filters['product_type'])
                if filters.get('status') == 'active':
                    qs = qs.filter(is_active=True)
                elif filters.get('status') == 'inactive':
                    qs = qs.filter(is_active=False)
                if filters.get('assigned') == 'assigned':
                    qs = qs.filter(client__isnull=False)
                elif filters.get('assigned') == 'unassigned':
                    qs = qs.filter(client__isnull=True)

                rows = []
                for s in qs:
                    rows.append([
                        s.serial_number or '-',
                        s.client.farm_name if s.client else 'Unassigned',
                        s.product_type or '-',
                        'Active' if s.is_active else 'Inactive',
                        str(s.assigned_date) if s.assigned_date else '-'
                    ])

                summary_stats['Total Serials'] = len(rows)
                header = '| Serial # | Client | Product | Status | Assigned Date |\n|---|---|---|---|---|\n'
                body = '\n'.join([f'| {" | ".join(r)} |' for r in rows]) if rows else '| No data | | | | |'
                sections.append(f'## 4Genetics Serials\n\n{header}{body}\n')

            elif key == 'projects':
                qs = Project.objects.all()
                if filters.get('status'):
                    qs = qs.filter(status=filters['status'])

                rows = []
                for p in qs:
                    desc = (p.description[:60] + '...') if p.description and len(p.description) > 60 else (p.description or '-')
                    rows.append([
                        p.name,
                        p.status or '-',
                        desc,
                        str(p.created_at.date()) if p.created_at else '-'
                    ])

                summary_stats['Total Projects'] = len(rows)
                header = '| Name | Status | Description | Created |\n|---|---|---|---|\n'
                body = '\n'.join([f'| {" | ".join(r)} |' for r in rows]) if rows else '| No data | | | |'
                sections.append(f'## Projects\n\n{header}{body}\n')

        # Build summary stats section
        if summary_stats:
            stats_header = '| Metric | Value |\n|---|---|\n'
            stats_body = '\n'.join([f'| {k} | {v} |' for k, v in summary_stats.items()])
            summary_section = f'## Report Summary\n\n{stats_header}{stats_body}\n\n---\n\n'
        else:
            summary_section = ''

        full_content = summary_section + '\n\n'.join(sections)

        try:
            pdf_buffer = generate_pdf_report(full_content, title=title)
            filename = f"report_{uuid.uuid4().hex[:8]}.pdf"
            reports_dir = os.path.join(settings.MEDIA_ROOT, 'reports')
            os.makedirs(reports_dir, exist_ok=True)
            filepath = os.path.join(reports_dir, filename)
            with open(filepath, 'wb') as f:
                f.write(pdf_buffer.getvalue())
            file_url = request.build_absolute_uri(settings.MEDIA_URL + f"reports/{filename}")
            return Response({'pdf_url': file_url, 'preview_content': full_content})
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class ReportBuilderPreviewView(views.APIView):
    """
    Returns just the data preview (no PDF) for the report builder.
    Same request body as ReportBuilderView but returns JSON data tables.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from .models import Client, Invoice, Ticket, Payment, GeneticsSerial, Project

        modules = request.data.get('modules', [])
        result = {}
        today = timezone.now().date()

        for mod in modules:
            key = mod.get('key')
            filters = mod.get('filters', {})

            if key == 'clients':
                qs = Client.objects.all()
                fstatus = filters.get('status')
                if fstatus == 'active':
                    qs = qs.filter(subscription_end_date__gte=today)
                elif fstatus == 'expired':
                    qs = qs.filter(subscription_end_date__lt=today)
                elif fstatus == 'expiring':
                    qs = qs.filter(subscription_end_date__gte=today, subscription_end_date__lte=today + timedelta(days=60))
                if filters.get('demo_only'):
                    qs = qs.filter(is_demo=True)
                result['clients'] = {
                    'columns': ['Name', 'Farm', 'Phone', 'Subscription End', 'Status'],
                    'rows': [
                        [c.name, c.farm_name, c.phone or '-',
                         str(c.subscription_end_date) if c.subscription_end_date else '-',
                         'Active' if c.subscription_end_date and c.subscription_end_date >= today else 'Expired']
                        for c in qs
                    ],
                    'count': qs.count()
                }

            elif key == 'invoices':
                qs = Invoice.objects.select_related('client').all()
                if filters.get('status'):
                    qs = qs.filter(status=filters['status'])
                if filters.get('type'):
                    qs = qs.filter(invoice_type=filters['type'])
                if filters.get('date_from'):
                    qs = qs.filter(created_at__date__gte=filters['date_from'])
                if filters.get('date_to'):
                    qs = qs.filter(created_at__date__lte=filters['date_to'])
                result['invoices'] = {
                    'columns': ['Client', 'Type', 'Amount', 'Status', 'Date'],
                    'rows': [
                        [inv.client.name if inv.client else '-', inv.invoice_type or '-',
                         f'${float(inv.total_amount or 0):,.2f}', inv.status or '-',
                         str(inv.created_at.date()) if inv.created_at else '-']
                        for inv in qs
                    ],
                    'count': qs.count(),
                    'total': float(qs.aggregate(total=Sum('total_amount'))['total'] or 0)
                }

            elif key == 'tickets':
                qs = Ticket.objects.select_related('client').all()
                if filters.get('status'):
                    qs = qs.filter(status=filters['status'])
                if filters.get('category'):
                    qs = qs.filter(category=filters['category'])
                if filters.get('date_from'):
                    qs = qs.filter(created_at__date__gte=filters['date_from'])
                if filters.get('date_to'):
                    qs = qs.filter(created_at__date__lte=filters['date_to'])
                result['tickets'] = {
                    'columns': ['Client', 'Category', 'Status', 'Description', 'Date'],
                    'rows': [
                        [t.client.name if t.client else '-', t.category or '-', t.status or '-',
                         (t.issue_description[:60] + '...') if len(t.issue_description) > 60 else t.issue_description,
                         str(t.created_at.date()) if t.created_at else '-']
                        for t in qs
                    ],
                    'count': qs.count()
                }

            elif key == 'payments':
                qs = Payment.objects.select_related('invoice', 'invoice__client').all()
                if filters.get('direction'):
                    qs = qs.filter(direction=filters['direction'])
                if filters.get('date_from'):
                    qs = qs.filter(date__gte=filters['date_from'])
                if filters.get('date_to'):
                    qs = qs.filter(date__lte=filters['date_to'])
                result['payments'] = {
                    'columns': ['Client', 'Amount', 'Direction', 'Date'],
                    'rows': [
                        [p.invoice.client.name if p.invoice and p.invoice.client else '-',
                         f'${float(p.amount or 0):,.2f}', p.direction or '-',
                         str(p.date) if p.date else '-']
                        for p in qs
                    ],
                    'count': qs.count(),
                    'total': float(qs.aggregate(total=Sum('amount'))['total'] or 0)
                }

            elif key == 'serials':
                qs = GeneticsSerial.objects.select_related('client').all()
                if filters.get('product_type'):
                    qs = qs.filter(product_type=filters['product_type'])
                if filters.get('status') == 'active':
                    qs = qs.filter(is_active=True)
                elif filters.get('status') == 'inactive':
                    qs = qs.filter(is_active=False)
                if filters.get('assigned') == 'assigned':
                    qs = qs.filter(client__isnull=False)
                elif filters.get('assigned') == 'unassigned':
                    qs = qs.filter(client__isnull=True)
                result['serials'] = {
                    'columns': ['Serial #', 'Client', 'Product', 'Status', 'Assigned Date'],
                    'rows': [
                        [s.serial_number or '-', s.client.farm_name if s.client else 'Unassigned',
                         s.product_type or '-', 'Active' if s.is_active else 'Inactive',
                         str(s.assigned_date) if s.assigned_date else '-']
                        for s in qs
                    ],
                    'count': qs.count()
                }

            elif key == 'projects':
                qs = Project.objects.all()
                if filters.get('status'):
                    qs = qs.filter(status=filters['status'])
                result['projects'] = {
                    'columns': ['Name', 'Status', 'Description', 'Created'],
                    'rows': [
                        [p.name, p.status or '-',
                         (p.description[:60] + '...') if p.description and len(p.description) > 60 else (p.description or '-'),
                         str(p.created_at.date()) if p.created_at else '-']
                        for p in qs
                    ],
                    'count': qs.count()
                }

        return Response(result)
