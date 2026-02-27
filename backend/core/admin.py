from django.contrib import admin
from .models import Client, LivestockType, Invoice, Payment, Ticket, SubscriptionModule, GeneticsSerial, Reminder


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ['name', 'farm_name', 'phone', 'subscription_end_date', 'is_expiring_soon', 'is_demo']
    list_filter = ['subscription_end_date', 'is_demo']
    search_fields = ['name', 'farm_name', 'phone']
    readonly_fields = ['whatsapp_link', 'is_expiring_soon']


@admin.register(LivestockType)
class LivestockTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'price_multiplier']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['id', 'client', 'invoice_type', 'total_amount', 'status', 'created_at']
    list_filter = ['status', 'invoice_type', 'created_at']
    search_fields = ['client__name', 'client__farm_name']
    filter_horizontal = ['livestock_selection']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'invoice', 'amount', 'date', 'direction']
    list_filter = ['direction', 'date']


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ['id', 'client', 'category', 'status', 'created_at']
    list_filter = ['status', 'category', 'created_at']
    search_fields = ['client__name', 'issue_description']


@admin.register(SubscriptionModule)
class SubscriptionModuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'order']
    list_editable = ['is_active', 'order']
    search_fields = ['name']


@admin.register(GeneticsSerial)
class GeneticsSerialAdmin(admin.ModelAdmin):
    list_display = ['serial_number', 'product_type', 'client', 'is_active', 'assigned_date']
    list_filter = ['product_type', 'is_active', 'assigned_date']
    search_fields = ['serial_number', 'client__name', 'client__farm_name']
    autocomplete_fields = ['client']


@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = ['title', 'reminder_type', 'priority', 'due_date', 'is_read', 'is_dismissed', 'client']
    list_filter = ['reminder_type', 'priority', 'is_read', 'is_dismissed', 'is_auto_generated']
    search_fields = ['title', 'message', 'client__name', 'client__farm_name']
    list_editable = ['is_read', 'is_dismissed']
    date_hierarchy = 'due_date'
    actions = ['mark_as_read', 'mark_as_dismissed', 'generate_auto_reminders']
    
    @admin.action(description="Mark selected reminders as read")
    def mark_as_read(self, request, queryset):
        queryset.update(is_read=True)
    
    @admin.action(description="Dismiss selected reminders")
    def mark_as_dismissed(self, request, queryset):
        queryset.update(is_dismissed=True)
    
    @admin.action(description="Generate auto reminders from data")
    def generate_auto_reminders(self, request, queryset):
        count = Reminder.generate_auto_reminders()
        self.message_user(request, f"Generated {count} new auto reminders")
