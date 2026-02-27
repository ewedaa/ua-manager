"""
Utility functions for invoice calculations and business logic.
"""
from decimal import Decimal


# Base price for livestock (can be configured in settings or database later)
BASE_PRICE = Decimal('1000.00')

# Purchase markup percentage
PURCHASE_MARKUP = Decimal('0.30')  # 30%


def calculate_price(livestock_list, invoice_type):
    """
    Calculate the total price for an invoice based on livestock and type.
    
    Args:
        livestock_list: List of LivestockType objects
        invoice_type: 'Renewal' or 'Purchase'
    
    Returns:
        Decimal: Calculated total price
    
    Logic:
        - Renewal: Sum of (Base Price * Livestock Multiplier)
        - Purchase: Same as Renewal + 30% markup
    """
    if not livestock_list:
        return Decimal('0.00')
    
    # Calculate base total: Sum of (Base Price * Livestock Multiplier)
    base_total = sum(
        BASE_PRICE * Decimal(str(livestock.price_multiplier))
        for livestock in livestock_list
    )
    
    if invoice_type == 'Purchase':
        # Add 30% markup for purchases
        total = base_total * (1 + PURCHASE_MARKUP)
    else:
        # Renewal - no markup
        total = base_total
    
    return total.quantize(Decimal('0.01'))


def get_alert_status(subscription_end_date):
    """
    Determine the alert status based on subscription end date.
    
    Args:
        subscription_end_date: Date when subscription expires
    
    Returns:
        str: 'critical' if < 60 days away, 'safe' otherwise
    """
    from django.utils import timezone
    
    if not subscription_end_date:
        return 'critical'
    
    days_until_expiry = (subscription_end_date - timezone.now().date()).days
    
    if days_until_expiry < 0:
        return 'expired'
    if days_until_expiry < 60:
        return 'critical'
    return 'safe'
