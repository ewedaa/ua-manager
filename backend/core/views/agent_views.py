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

