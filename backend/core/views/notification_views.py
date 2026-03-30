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


