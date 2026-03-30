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


class ClientViewSet(viewsets.ModelViewSet):
    """ViewSet for Client CRUD operations."""
    queryset = Client.objects.prefetch_related(
        'contacts', 'files', 'invoices', 'tickets', 'subscription_modules'
    ).select_related('livestock_type')
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
        today = timezone.now().date()
        expiring_clients = self.queryset.filter(
            subscription_end_date__gte=today,
            subscription_end_date__lte=today + timedelta(days=60)
        )
        serializer = self.get_serializer(expiring_clients, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        instance = serializer.save()
        ActivityLog.log('client_created', f'Client "{instance.farm_name}" was created', 'client', instance.id)
        
        if instance.is_4genetics_college:
            GeneticsSerial.objects.create(
                client=instance,
                serial_number=f"4GEN-{instance.id}-{uuid.uuid4().hex[:6].upper()}",
                product_type='Dairy Cows',  # Default valid choice
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


# ── Dashboard & Analytics Views ──────────────────────────────────────────────


