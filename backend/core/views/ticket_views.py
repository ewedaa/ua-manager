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


class IssueCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for managing issue categories (full CRUD)."""
    queryset = IssueCategory.objects.all()
    serializer_class = IssueCategorySerializer


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

