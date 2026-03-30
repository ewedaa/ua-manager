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


class InvoiceViewSet(viewsets.ModelViewSet):
    """ViewSet for Invoice CRUD operations."""
    queryset = Invoice.objects.select_related('client').prefetch_related('livestock_selection', 'payments', 'selected_modules')
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
        data = self.request.data
        new_farm_name = data.get('new_farm_name')
        inv_type = data.get('invoice_type')
        
        if new_farm_name and inv_type == 'Purchase Quotation':
            # Create a quoted farm
            client = Client.objects.create(
                name=new_farm_name,
                farm_name=new_farm_name,
                is_quoted=True,
                subscription_start_date=timezone.now().date(),
                subscription_end_date=timezone.now().date() + timedelta(days=365),
                phone='N/A'
            )
            instance = serializer.save(client=client)
        else:
            instance = serializer.save()
            
        # Safer activity logging
        try:
            target_name = "Unknown Farm"
            if instance.client:
                target_name = instance.client.farm_name or instance.client.name
            
            ActivityLog.log(
                action='invoice_created',
                description=f'Invoice #{instance.id} created for "{target_name}"',
                entity_type='invoice',
                entity_id=instance.id
            )
        except Exception as e:
            print(f"Failed to log activity: {e}")

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
        invoice = self.get_object()
        target_currency = request.data.get('target_currency')

        try:
            buffer = generate_formal_invoice_pdf(invoice, target_currency=target_currency)
            filename = f"invoice_{invoice.id}.pdf"
            if target_currency:
                filename = f"invoice_{invoice.id}_{target_currency.lower()}.pdf"
            if invoice.pdf_file:
                invoice.pdf_file.delete(save=False)
            invoice.pdf_file.save(filename, ContentFile(buffer.getvalue()), save=True)
            return Response({'pdf_url': invoice.pdf_file.url, 'message': 'PDF Generated Successfully'})
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['post'])
    def generate_internal_pdf(self, request, pk=None):
        """Generate an INTERNAL PDF with full cost breakdown (what we owe Uniform) for 4Genetics."""
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

        inv_currency = getattr(invoice, 'currency', 'EUR')
        rate = getattr(invoice, 'exchange_rate', None)
        use_egp = inv_currency == 'EGP' and rate

        def to_display(eur_amount):
            if use_egp:
                converted = (eur_amount * Decimal(str(rate))).quantize(Decimal('0.01'))
                return f'{converted} EGP'
            return f'€{eur_amount}'

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
                
                cost_disp = to_display(cost)
                cust_disp = to_display(cust)
                margin_disp = to_display(margin)
                
                lines.append(f"| {mod.name} | {cost_disp} | {cust_disp} | +{margin_disp} |")
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

        cost = invoice.cost_total or 0
        customer = invoice.customer_total or invoice.total_amount
        try:
            profit = float(str(customer)) - float(str(cost))
        except (ValueError, TypeError):
            profit = 0

        curr_label = 'EGP' if use_egp else '€'

        lines.extend([
            "## Financial Summary",
            f"- **💸 Due to Uniform Agri (our cost):** {cost} {curr_label}",
            f"- **💰 Due from Farm (base customer price):** {customer} {curr_label}",
        ])
        
        if getattr(invoice, 'include_vat', False):
            vat_amount = round(float(customer) * 0.14, 2)
            total_with_vat = round(float(customer) + vat_amount, 2)
            lines.extend([
                f"- **➕ Value Added Tax (14%):** {vat_amount} {curr_label}",
                f"- **🛒 Total with VAT:** {total_with_vat} {curr_label}",
            ])

        lines.extend([
            f"- **📈 Your Profit:** +{profit:.2f} {curr_label}",
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


