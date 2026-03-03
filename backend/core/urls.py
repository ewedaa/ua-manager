from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ClientViewSet, LivestockTypeViewSet, InvoiceViewSet,
    PaymentViewSet, TicketViewSet, AgentQueryView, SubscriptionModuleViewSet,
    GeneticsSerialViewSet, ClientFileViewSet, IssueCategoryViewSet,
    ClientContactView,
    DashboardStatsView, ChartDataView, NotificationsView,
    MarkAllNotificationsReadView, DismissAllNotificationsView, EmailReportView,
    AISuggestionView, FileAnalysisView, InsightsView,
    ActivityLogView, TodoView, ProjectViewSet,
    BusinessReportView, CustomReportView,
    AITicketDraftView, AIClientSummaryView,
    ReportBuilderView, ReportBuilderPreviewView
)
from .backup_views import BackupExportView, BackupImportView, ImportPreviewView, SystemHealthView

router = DefaultRouter()
router.register(r'clients', ClientViewSet)
router.register(r'livestock-types', LivestockTypeViewSet)
router.register(r'invoices', InvoiceViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'tickets', TicketViewSet)
router.register(r'subscription-modules', SubscriptionModuleViewSet)
router.register(r'genetics-serials', GeneticsSerialViewSet)
router.register(r'projects', ProjectViewSet)
router.register(r'issue-categories', IssueCategoryViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('ask-agent/', AgentQueryView.as_view(), name='ask-agent'),
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('chart-data/', ChartDataView.as_view(), name='chart-data'),
    path('notifications/', NotificationsView.as_view(), name='notifications'),
    path('notifications/<int:pk>/', NotificationsView.as_view(), name='notification-detail'),
    path('notifications/mark-all-read/', MarkAllNotificationsReadView.as_view(), name='mark-all-read'),
    path('notifications/dismiss-all/', DismissAllNotificationsView.as_view(), name='dismiss-all'),
    path('email-report/', EmailReportView.as_view(), name='email-report'),
    path('ai-suggest/', AISuggestionView.as_view(), name='ai-suggest'),
    path('ai-ticket-draft/', AITicketDraftView.as_view(), name='ai-ticket-draft'),
    path('ai-client-summary/', AIClientSummaryView.as_view(), name='ai-client-summary'),
    path('analyze-file/', FileAnalysisView.as_view(), name='analyze-file'),
    path('generate-insights/', InsightsView.as_view(), name='generate-insights'),
    path('business-report/', BusinessReportView.as_view(), name='business-report'),
    path('activity-log/', ActivityLogView.as_view(), name='activity-log'),
    path('todos/', TodoView.as_view(), name='todos'),
    path('todos/<int:pk>/', TodoView.as_view(), name='todo-detail'),
    path('custom-report/', CustomReportView.as_view(), name='custom-report'),
    path('report-builder/', ReportBuilderView.as_view(), name='report-builder'),
    path('report-builder-preview/', ReportBuilderPreviewView.as_view(), name='report-builder-preview'),
    path('backup/', BackupExportView.as_view(), name='backup-export'),
    path('import/', BackupImportView.as_view(), name='backup-import'),
    path('import-preview/', ImportPreviewView.as_view(), name='import-preview'),
    path('system-health/', SystemHealthView.as_view(), name='system-health'),
    # Client files
    path('clients/<int:client_pk>/files/', ClientFileViewSet.as_view({'get': 'list', 'post': 'create'}), name='client-files'),
    path('clients/<int:client_pk>/files/<int:pk>/', ClientFileViewSet.as_view({'delete': 'destroy'}), name='client-file-detail'),
    # Client contacts
    path('clients/<int:client_pk>/contacts/', ClientContactView.as_view(), name='client-contacts'),
]
