from rest_framework import serializers
from .models import Client, LivestockType, Invoice, Payment, Ticket, Contact, SubscriptionModule, GeneticsSerial, ClientFile, IssueCategory


class LivestockTypeSerializer(serializers.ModelSerializer):
    """Serializer for LivestockType model."""
    
    class Meta:
        model = LivestockType
        fields = ['id', 'name', 'price_multiplier', 'created_at']
        read_only_fields = ['created_at']


class ContactSerializer(serializers.ModelSerializer):
    """Serializer for Contact model."""
    
    class Meta:
        model = Contact
        fields = ['id', 'name', 'phone', 'role']


class ClientFileSerializer(serializers.ModelSerializer):
    """Serializer for ClientFile model."""
    
    class Meta:
        model = ClientFile
        fields = ['id', 'client', 'file', 'original_name', 'file_size', 'category', 'description', 'contact_person', 'file_date', 'uploaded_at']
        read_only_fields = ['client', 'uploaded_at', 'original_name', 'file_size']


class SubscriptionModuleSerializer(serializers.ModelSerializer):
    """Serializer for SubscriptionModule model."""
    purchase_customer_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    renewal_customer_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    purchase_our_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    renewal_our_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    # Backward-compat aliases
    price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    customer_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = SubscriptionModule
        fields = [
            'id', 'name', 'description',
            'purchase_price', 'renewal_price',
            'purchase_customer_price', 'renewal_customer_price',
            'purchase_our_price', 'renewal_our_price',
            'price', 'customer_price',
            'is_active', 'order',
        ]


class GeneticsSerialSerializer(serializers.ModelSerializer):
    """Serializer for GeneticsSerial model."""
    
    class Meta:
        model = GeneticsSerial
        fields = ['id', 'serial_number', 'college_name', 'product_type', 'role', 'modules', 'is_active', 'assigned_date', 'start_date', 'end_date', 'notes', 'created_at']
        read_only_fields = ['created_at']


class IssueCategorySerializer(serializers.ModelSerializer):
    """Serializer for IssueCategory model."""
    
    class Meta:
        model = IssueCategory
        fields = ['id', 'name', 'order']


class TicketSerializer(serializers.ModelSerializer):
    """Serializer for Ticket model."""
    client_name = serializers.CharField(source='client.name', read_only=True)
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'client', 'client_name', 'issue_description', 'contact_person',
            'status', 'category', 'resolution_notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for Payment model."""
    
    class Meta:
        model = Payment
        fields = ['id', 'invoice', 'amount', 'date', 'direction', 'created_at']
        read_only_fields = ['created_at']


class InvoiceSimpleSerializer(serializers.ModelSerializer):
    """Simple Invoice serializer for nested use in ClientSerializer."""
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_type', 'total_amount',
            'cost_total', 'customer_total', 'notes',
            'status', 'pdf_file', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class ClientSerializer(serializers.ModelSerializer):
    """Serializer for Client model."""
    whatsapp_link = serializers.ReadOnlyField()
    is_expiring_soon = serializers.ReadOnlyField()
    alert_status = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    
    tickets = TicketSerializer(many=True, read_only=True)
    invoices = InvoiceSimpleSerializer(many=True, read_only=True)
    contacts = ContactSerializer(many=True, required=False)
    files = ClientFileSerializer(many=True, read_only=True)

    class Meta:
        model = Client
        fields = [
            'id', 'name', 'farm_name', 'phone', 'serial_number', 'livestock_type',
            'subscription_modules', 'general_notes', 'contacts', 'whatsapp_link',
            'subscription_start_date', 'subscription_end_date',
            'is_demo', 'is_quoted', 'demo_start_date', 'demo_end_date', 'is_4genetics_college',
            'is_expiring_soon', 'alert_status', 'status', 'tickets', 'invoices', 'files', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'whatsapp_link', 'is_expiring_soon', 'alert_status', 'status']
    
    def update(self, instance, validated_data):
        contacts_data = validated_data.pop('contacts', None)
        instance = super().update(instance, validated_data)
        
        if contacts_data is not None:
            instance.contacts.all().delete()
            for contact_data in contacts_data:
                Contact.objects.create(client=instance, **contact_data)
        return instance
    
    def get_alert_status(self, obj):
        """Return 'critical' if renewal < 60 days away, else 'safe'."""
        from .utils import get_alert_status
        return get_alert_status(obj.subscription_end_date)

    def get_status(self, obj):
        """Return human-readable status: 'Active', 'Expiring Soon', or 'Expired'."""
        from .utils import get_alert_status
        alert = get_alert_status(obj.subscription_end_date)
        if alert == 'expired':
            return 'Expired'
        if alert == 'critical':
            return 'Expiring Soon'
        return 'Active'


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer for Invoice model with full details."""
    client = serializers.PrimaryKeyRelatedField(
        queryset=Client.objects.all(),
        required=False,
        allow_null=True
    )
    client_name = serializers.CharField(source='client.name', read_only=True)
    livestock_selection = LivestockTypeSerializer(many=True, read_only=True)
    livestock_ids = serializers.PrimaryKeyRelatedField(
        queryset=LivestockType.objects.all(),
        many=True,
        write_only=True,
        source='livestock_selection',
        required=False
    )
    selected_modules = SubscriptionModuleSerializer(many=True, read_only=True)
    selected_module_ids = serializers.PrimaryKeyRelatedField(
        queryset=SubscriptionModule.objects.all(),
        many=True,
        write_only=True,
        source='selected_modules',
        required=False
    )
    payments = PaymentSerializer(many=True, read_only=True)
    new_farm_name = serializers.CharField(write_only=True, required=False)
    
    def create(self, validated_data):
        # Remove non-model fields before saving
        validated_data.pop('new_farm_name', None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Remove non-model fields before updating
        validated_data.pop('new_farm_name', None)
        return super().update(instance, validated_data)

    class Meta:
        model = Invoice
        fields = [
            'id', 'client', 'client_name', 'invoice_type', 'new_farm_name',
            'livestock_selection', 'livestock_ids',
            'selected_modules', 'selected_module_ids',
            'total_amount', 'cost_total', 'customer_total', 'notes',
            'status', 'is_dairylive', 'currency', 'exchange_rate', 'paid_to_uniform',
            'pdf_file', 'payments', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class ClientDetailSerializer(ClientSerializer):
    """Detailed client serializer with nested invoices and tickets."""
    invoices = InvoiceSerializer(many=True, read_only=True)
    tickets = TicketSerializer(many=True, read_only=True)
    
    class Meta(ClientSerializer.Meta):
        fields = ClientSerializer.Meta.fields + ['invoices', 'tickets']


class ReminderSerializer(serializers.ModelSerializer):
    """Serializer for Reminder/Notification model."""
    from .models import Reminder
    
    client_name = serializers.CharField(source='client.farm_name', read_only=True, allow_null=True)
    type_display = serializers.CharField(source='get_reminder_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    
    class Meta:
        from .models import Reminder
        model = Reminder
        fields = [
            'id', 'title', 'message', 'reminder_type', 'type_display',
            'priority', 'priority_display', 'due_date',
            'client', 'client_name', 'ticket', 'invoice',
            'is_read', 'is_dismissed', 'is_auto_generated',
            'snoozed_until',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'is_auto_generated']


class ActivityLogSerializer(serializers.ModelSerializer):
    """Serializer for ActivityLog model."""
    from .models import ActivityLog
    
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        from .models import ActivityLog
        model = ActivityLog
        fields = ['id', 'action', 'action_display', 'description', 'entity_type', 'entity_id', 'created_at']
        read_only_fields = ['created_at']


class TodoSerializer(serializers.ModelSerializer):
    """Serializer for Todo model."""
    from .models import Todo
    
    class Meta:
        from .models import Todo
        model = Todo
        fields = ['id', 'text', 'priority', 'status', 'due_date', 'is_done', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class ProjectSerializer(serializers.ModelSerializer):
    """Serializer for Project model."""
    from .models import Project

    class Meta:
        from .models import Project
        model = Project
        fields = ['id', 'name', 'description', 'status', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

