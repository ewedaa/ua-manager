from django.db import models
from django.utils import timezone
from datetime import timedelta


class Client(models.Model):
    """Client model representing a dairy farm subscriber."""
    name = models.CharField(max_length=255, db_index=True)
    farm_name = models.CharField(max_length=255, db_index=True)
    phone = models.CharField(max_length=20)
    serial_number = models.CharField(max_length=100, blank=True)
    subscription_modules = models.TextField(blank=True, help_text="Details of subscription modules")
    general_notes = models.TextField(blank=True, help_text="Additional notes/contacts")
    subscription_start_date = models.DateField()
    subscription_end_date = models.DateField()
    is_demo = models.BooleanField(default=False, help_text="Is this farm in demo/trial mode?")
    demo_start_date = models.DateField(null=True, blank=True)
    demo_end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def whatsapp_link(self):
        """Generate WhatsApp link from phone number."""
        # Remove any non-digit characters
        clean_phone = ''.join(filter(str.isdigit, self.phone))
        return f"https://wa.me/{clean_phone}"

    @property
    def is_expiring_soon(self):
        """Returns True if subscription_end_date is within 60 days."""
        if not self.subscription_end_date:
            return False
        days_until_expiry = (self.subscription_end_date - timezone.now().date()).days
        return 0 <= days_until_expiry <= 60

    def __str__(self):
        return f"{self.name} - {self.farm_name}"

    class Meta:
        ordering = ['name']


class LivestockType(models.Model):
    """Livestock type with pricing multiplier."""
    LIVESTOCK_CHOICES = [
        ('Cows', 'Cows'),
        ('Buffaloes', 'Buffaloes'),
        ('Fattening', 'Fattening'),
        ('Sheep', 'Sheep'),
        ('Goat', 'Goat'),
    ]

    name = models.CharField(max_length=50, choices=LIVESTOCK_CHOICES, unique=True)
    price_multiplier = models.DecimalField(max_digits=5, decimal_places=2, default=1.00)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (x{self.price_multiplier})"

    class Meta:
        verbose_name = "Livestock Type"
        verbose_name_plural = "Livestock Types"


class Invoice(models.Model):
    """Invoice model for client billing."""
    INVOICE_TYPE_CHOICES = [
        ('Renewal Invoice', 'Renewal Invoice'),
        ('Purchase Invoice', 'Purchase Invoice'),
        ('Purchase Quotation', 'Purchase Quotation'),
    ]

    STATUS_CHOICES = [
        ('Paid to Us', 'Paid to Us'),
        ('Paid to Uniform', 'Paid to Uniform'),
        ('Due', 'Due'),
    ]

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='invoices')
    invoice_type = models.CharField(max_length=30, choices=INVOICE_TYPE_CHOICES)
    livestock_selection = models.ManyToManyField(LivestockType, related_name='invoices')
    selected_modules = models.ManyToManyField('SubscriptionModule', related_name='invoices', blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    cost_total = models.DecimalField(max_digits=10, decimal_places=2, default=0,
        help_text="Total cost price (what we pay Uniform Agri)")
    customer_total = models.DecimalField(max_digits=10, decimal_places=2, default=0,
        help_text="Total customer price (what the farm pays us)")
    notes = models.TextField(blank=True, help_text="Invoice notes")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Due', db_index=True)
    pdf_file = models.FileField(upload_to='invoices/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Invoice #{self.id} - {self.client.name} ({self.status})"

    class Meta:
        ordering = ['-created_at']


class Payment(models.Model):
    """Payment tracking for invoices."""
    DIRECTION_CHOICES = [
        ('Inbound', 'Inbound'),
        ('Outbound', 'Outbound'),
    ]

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
    direction = models.CharField(max_length=10, choices=DIRECTION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment #{self.id} - {self.amount} ({self.direction})"

    class Meta:
        ordering = ['-date']


class Ticket(models.Model):
    """Support ticket for client issues."""
    STATUS_CHOICES = [
        ('Open', 'Open'),
        ('In Progress', 'In Progress'),
        ('Resolved', 'Resolved'),
        ('Closed', 'Closed'),
    ]

    CATEGORY_CHOICES = [
        ('Database', 'Database'),
        ('Milk Meter', 'Milk Meter'),
        ('Activity System', 'Activity System'),
        ('Other', 'Other'),
    ]

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='tickets')
    issue_description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Open', db_index=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, db_index=True)
    resolution_notes = models.TextField(blank=True, help_text="Feedback or resolution notes for this ticket")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Ticket #{self.id} - {self.client.name} ({self.status})"

    class Meta:
        ordering = ['-created_at']


class Contact(models.Model):
    """Contact person for a Client farm."""
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='contacts')
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    role = models.CharField(max_length=100, blank=True, help_text="e.g. Manager, Herdsman, Owner")
    
    def __str__(self):
        return f"{self.name} ({self.role}) - {self.client.farm_name}"


class ClientFile(models.Model):
    """File attachment for a Client."""
    CATEGORY_CHOICES = [
        ('general', 'General'),
        ('whatsapp', 'WhatsApp Screenshot'),
    ]

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='files')
    file = models.FileField(upload_to='client_files/')
    original_name = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(default=0, help_text="File size in bytes")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='general', db_index=True)
    description = models.CharField(max_length=500, blank=True, help_text="Description of the file or screenshot")
    contact_person = models.CharField(max_length=255, blank=True, help_text="Related contact person")
    file_date = models.DateField(null=True, blank=True, help_text="Date of the file or screenshot")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.original_name} ({self.client.farm_name})"


class SubscriptionModule(models.Model):
    """Available subscription modules that can be assigned to clients."""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Cost price in EGP (what we pay Uniform Agri)")
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    @property
    def customer_price(self):
        """Price x 1.30 x 1.10 = what the farm pays us."""
        from decimal import Decimal, ROUND_HALF_UP
        return (self.price * Decimal('1.30') * Decimal('1.10')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    class Meta:
        ordering = ['order', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.price} EGP)"


class GeneticsSerial(models.Model):
    """4Genetics serial number tracking."""
    PRODUCT_CHOICES = [
        ('Milk Meter', 'Milk Meter'),
        ('Activity Collar', 'Activity Collar'),
        ('Rumination Tag', 'Rumination Tag'),
        ('Heat Detection', 'Heat Detection'),
        ('Other', 'Other'),
    ]
    
    serial_number = models.CharField(max_length=100, unique=True)
    client = models.ForeignKey(Client, on_delete=models.SET_NULL, null=True, blank=True, related_name='genetics_serials')
    product_type = models.CharField(max_length=100, choices=PRODUCT_CHOICES)
    is_active = models.BooleanField(default=True)
    assigned_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        client_name = self.client.farm_name if self.client else 'Unassigned'
        return f"{self.serial_number} - {self.product_type} ({client_name})"

    class Meta:
        ordering = ['-created_at']
        verbose_name = "4Genetics Serial"
        verbose_name_plural = "4Genetics Serials"


class Reminder(models.Model):
    """Notification/Reminder system for alerts and custom reminders."""
    TYPE_CHOICES = [
        ('subscription_expiring', 'Subscription Expiring'),
        ('invoice_due', 'Invoice Due'),
        ('ticket_stale', 'Ticket Stale'),
        ('demo_expiring', 'Demo Expiring'),
        ('custom', 'Custom Reminder'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    title = models.CharField(max_length=200)
    message = models.TextField()
    reminder_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default='custom')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    due_date = models.DateTimeField()
    
    # Related objects (optional)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, null=True, blank=True, related_name='reminders')
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, null=True, blank=True, related_name='reminders')
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, null=True, blank=True, related_name='reminders')
    
    # Status tracking
    is_read = models.BooleanField(default=False)
    is_dismissed = models.BooleanField(default=False)
    is_auto_generated = models.BooleanField(default=False)
    snoozed_until = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-due_date', '-priority']
    
    def __str__(self):
        return f"{self.title} ({self.get_reminder_type_display()})"
    
    @classmethod
    def generate_auto_reminders(cls):
        """Generate automatic reminders for expiring subscriptions, due invoices, stale tickets."""
        from django.utils import timezone
        from datetime import timedelta
        
        today = timezone.now()
        reminders_created = 0
        
        # Subscription expiring reminders (within 30 days)
        expiring_clients = Client.objects.filter(
            subscription_end_date__lte=(today + timedelta(days=30)).date(),
            subscription_end_date__gte=today.date()
        )
        for client in expiring_clients:
            days_left = (client.subscription_end_date - today.date()).days
            priority = 'urgent' if days_left <= 7 else 'high' if days_left <= 14 else 'medium'
            
            existing = cls.objects.filter(
                client=client,
                reminder_type='subscription_expiring',
                is_dismissed=False
            ).exists()
            
            if not existing:
                cls.objects.create(
                    title=f"Subscription Expiring: {client.farm_name}",
                    message=f"{client.name}'s subscription expires in {days_left} days on {client.subscription_end_date}",
                    reminder_type='subscription_expiring',
                    priority=priority,
                    due_date=timezone.make_aware(timezone.datetime.combine(client.subscription_end_date, timezone.datetime.min.time())),
                    client=client,
                    is_auto_generated=True
                )
                reminders_created += 1
        
        # Due invoices
        due_invoices = Invoice.objects.filter(status='Due')
        for invoice in due_invoices:
            existing = cls.objects.filter(
                invoice=invoice,
                reminder_type='invoice_due',
                is_dismissed=False
            ).exists()
            
            if not existing:
                cls.objects.create(
                    title=f"Invoice Due: {invoice.client.farm_name}",
                    message=f"Invoice #{invoice.id} for ${invoice.total_amount} is due",
                    reminder_type='invoice_due',
                    priority='high',
                    due_date=today,
                    client=invoice.client,
                    invoice=invoice,
                    is_auto_generated=True
                )
                reminders_created += 1
        
        # Stale tickets (open > 7 days)
        stale_date = today - timedelta(days=7)
        stale_tickets = Ticket.objects.filter(
            status='Open',
            created_at__lte=stale_date
        )
        for ticket in stale_tickets:
            existing = cls.objects.filter(
                ticket=ticket,
                reminder_type='ticket_stale',
                is_dismissed=False
            ).exists()
            
            if not existing:
                days_open = (today.date() - ticket.created_at.date()).days
                cls.objects.create(
                    title=f"Stale Ticket: {ticket.client.farm_name}",
                    message=f"Ticket has been open for {days_open} days: {ticket.issue_description[:50]}...",
                    reminder_type='ticket_stale',
                    priority='medium',
                    due_date=today,
                    client=ticket.client,
                    ticket=ticket,
                    is_auto_generated=True
                )
                reminders_created += 1
        
        return reminders_created


class ActivityLog(models.Model):
    """Tracks all key actions in the system for audit trail and dashboard feed."""
    ACTION_TYPES = [
        ('client_created', 'Client Created'),
        ('client_updated', 'Client Updated'),
        ('invoice_created', 'Invoice Created'),
        ('invoice_paid', 'Invoice Paid'),
        ('ticket_created', 'Ticket Created'),
        ('ticket_resolved', 'Ticket Resolved'),
        ('payment_received', 'Payment Received'),
        ('serial_assigned', 'Serial Assigned'),
        ('reminder_created', 'Reminder Created'),
    ]
    
    action = models.CharField(max_length=30, choices=ACTION_TYPES)
    description = models.TextField()
    entity_type = models.CharField(max_length=50)  # 'client', 'invoice', 'ticket', etc.
    entity_id = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_action_display()} - {self.description[:50]}"
    
    @classmethod
    def log(cls, action, description, entity_type='', entity_id=None):
        """Helper to create a log entry."""
        return cls.objects.create(
            action=action,
            description=description,
            entity_type=entity_type,
            entity_id=entity_id
        )


class Todo(models.Model):
    """Backend-persisted todo/task items."""
    PRIORITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Urgent', 'Urgent'),
    ]
    STATUS_CHOICES = [
        ('todo', 'To Do'),
        ('in_progress', 'In Progress'),
        ('done', 'Done'),
    ]
    
    text = models.CharField(max_length=500)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='Medium')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='todo')
    due_date = models.DateField(null=True, blank=True)
    is_done = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{'✓' if self.is_done else '○'} {self.text}"


class Project(models.Model):
    """Project management model."""
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('On Hold', 'On Hold'),
        ('Completed', 'Completed'),
    ]

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.name} ({self.status})"


