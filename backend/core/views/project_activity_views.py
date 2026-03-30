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


class ActivityLogView(APIView):
    """API View for recent activity feed."""
    permission_classes = [AllowAny]

    def get(self, request):
        limit = int(request.query_params.get('limit', 20))
        logs = ActivityLog.objects.all()[:limit]
        serializer = ActivityLogSerializer(logs, many=True)
        return Response({'activities': serializer.data})


class TodoView(APIView):
    """API View for todo/task management."""
    permission_classes = [AllowAny]

    def get(self, request):
        filter_status = request.query_params.get('status', 'all')
        todos = Todo.objects.all()
        
        if filter_status == 'active':
            todos = todos.filter(is_done=False)
        elif filter_status == 'completed':
            todos = todos.filter(is_done=True)
        
        serializer = TodoSerializer(todos, many=True)
        return Response({'todos': serializer.data})

    def post(self, request):
        serializer = TodoSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def patch(self, request, pk=None):
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
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'status']

    def perform_create(self, serializer):
        instance = serializer.save()
        try:
            ActivityLog.log('project_created', f'Project "{instance.name}" was created', 'project', instance.id)
        except Exception:
            pass



