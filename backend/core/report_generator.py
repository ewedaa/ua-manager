from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image as RLImage,
    Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.lib.units import inch, mm
from io import BytesIO
import re
import os
import requests
from datetime import datetime


# ── Brand Colors ─────────────────────────────────────────────
BRAND_GREEN = colors.HexColor('#16a34a')
BRAND_GREEN_LIGHT = colors.HexColor('#dcfce7')
BRAND_GREEN_DARK = colors.HexColor('#14532d')
BRAND_GRAY = colors.HexColor('#374151')
BRAND_GRAY_LIGHT = colors.HexColor('#f9fafb')
BRAND_GRAY_MEDIUM = colors.HexColor('#9ca3af')
BRAND_BORDER = colors.HexColor('#e5e7eb')
WHITE = colors.white


# ── Logo Path ────────────────────────────────────────────────
LOGO_PATH = os.path.join(os.path.dirname(__file__), '4genetics_logo.png')
LOGO_RIGHT_PATH = os.path.join(os.path.dirname(__file__), 'uniform_agri_logo.png')


def _build_styles():
    """Create a premium set of paragraph styles."""
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        'ReportTitle',
        parent=styles['Title'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=28,
        textColor=BRAND_GRAY,
        spaceAfter=4,
        alignment=TA_LEFT,
    ))

    styles.add(ParagraphStyle(
        'ReportSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=13,
        textColor=BRAND_GRAY_MEDIUM,
        spaceAfter=16,
        alignment=TA_LEFT,
    ))

    styles.add(ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=20,
        textColor=BRAND_GREEN,
        spaceBefore=18,
        spaceAfter=8,
        borderPadding=(0, 0, 4, 0),
    ))

    styles.add(ParagraphStyle(
        'SubHeading',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=BRAND_GRAY,
        spaceBefore=12,
        spaceAfter=6,
    ))

    styles.add(ParagraphStyle(
        'BodyPremium',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=BRAND_GRAY,
        spaceAfter=4,
    ))

    styles.add(ParagraphStyle(
        'BulletItem',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=BRAND_GRAY,
        leftIndent=18,
        bulletIndent=6,
        spaceAfter=3,
    ))

    styles.add(ParagraphStyle(
        'FooterStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        textColor=BRAND_GRAY_MEDIUM,
        alignment=TA_CENTER,
    ))

    return styles


def _build_header(story, title, styles):
    """Build a premium branded header with dark-banner design."""
    from reportlab.platypus import Table as RLTable, TableStyle as RLTableStyle
    from reportlab.lib.units import inch

    now = datetime.now()
    date_str = now.strftime("%B %d, %Y  •  %I:%M %p")

    # ── Left Logo (4Genetics) ──
    if os.path.exists(LOGO_PATH):
        left_logo = RLImage(LOGO_PATH)
        target_h = 0.70 * inch
        ratio = target_h / left_logo.drawHeight
        left_logo.drawHeight = target_h
        left_logo.drawWidth = left_logo.drawWidth * ratio
        left_cell = left_logo
    else:
        left_cell = Paragraph('<b>4Genetics</b>',
            ParagraphStyle('LH', fontName='Helvetica-Bold', fontSize=14, textColor=WHITE))

    # ── Right Logo (Uniform Agri) ──
    if os.path.exists(LOGO_RIGHT_PATH):
        right_logo = RLImage(LOGO_RIGHT_PATH)
        target_h = 0.60 * inch
        ratio = target_h / right_logo.drawHeight
        right_logo.drawHeight = target_h
        right_logo.drawWidth = right_logo.drawWidth * ratio
        right_cell = right_logo
    else:
        right_cell = Paragraph('<b>Uniform Agri</b>',
            ParagraphStyle('RH', fontName='Helvetica-Bold', fontSize=14, textColor=WHITE))

    # ── Title block (center) ──
    title_style = ParagraphStyle('BannerTitle', fontName='Helvetica-Bold', fontSize=20,
                                  textColor=WHITE, leading=26, spaceAfter=2, alignment=TA_LEFT)
    sub_style = ParagraphStyle('BannerSub', fontName='Helvetica', fontSize=8.5,
                                textColor=colors.HexColor('#a3e635'), leading=12, alignment=TA_LEFT)
    date_style = ParagraphStyle('BannerDate', fontName='Helvetica', fontSize=8,
                                 textColor=colors.HexColor('#d1fae5'), leading=11, alignment=TA_LEFT)

    center_block = [
        Paragraph(title, title_style),
        Paragraph('4Genetics × Uniform Agri  —  Business Intelligence Report', sub_style),
        Spacer(1, 3),
        Paragraph(f'Generated on {date_str}', date_style),
    ]

    header_data = [[left_cell, center_block, right_cell]]
    header_table = Table(header_data, colWidths=[1.1 * inch, 4.0 * inch, 1.4 * inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'LEFT'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
        # Dark green banner background
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#14532d')),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('TOPPADDING', (0, 0), (-1, -1), 16),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 16),
        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
    ]))

    story.append(header_table)
    story.append(Spacer(1, 4))

    # ── Thin accent divider below banner ──
    story.append(HRFlowable(
        width="100%", thickness=2, color=BRAND_GREEN,
        spaceAfter=14, spaceBefore=2
    ))


def _build_footer(canvas, doc):
    """Draw footer on every page."""
    canvas.saveState()
    page_w, page_h = A4

    # Thin green line
    canvas.setStrokeColor(BRAND_GREEN)
    canvas.setLineWidth(1.5)
    canvas.line(40, 35, page_w - 40, 35)

    # Footer text
    canvas.setFont('Helvetica', 7.5)
    canvas.setFillColor(BRAND_GRAY_MEDIUM)
    canvas.drawString(40, 22, f'4Genetics  •  Confidential')
    canvas.drawRightString(page_w - 40, 22, f'Page {doc.page}')

    canvas.restoreState()


def _process_table(rows_raw, story, styles):
    """Convert raw markdown table rows into a styled ReportLab table."""
    if not rows_raw:
        return

    data = []
    for row_line in rows_raw:
        cleaned = row_line.strip().strip('|')
        cells = [c.strip() for c in cleaned.split('|')]
        # Skip separator lines (---|---)
        if all(set(c).issubset({'-', ':', ' '}) for c in cells):
            continue
        data.append(cells)

    if not data:
        return

    # Normalize column count
    max_cols = max(len(row) for row in data)
    final_data = []
    for row in data:
        # Wrap cell text in Paragraph for word wrapping
        formatted = []
        for i, cell in enumerate(row):
            if len(data) > 0 and row == data[0]:
                # Header row
                formatted.append(Paragraph(
                    f'<b>{cell}</b>',
                    ParagraphStyle('TableHeader', fontName='Helvetica-Bold',
                                   fontSize=9, leading=12, textColor=WHITE,
                                   alignment=TA_LEFT)
                ))
            else:
                formatted.append(Paragraph(
                    cell,
                    ParagraphStyle('TableCell', fontName='Helvetica',
                                   fontSize=9, leading=12, textColor=BRAND_GRAY,
                                   alignment=TA_LEFT)
                ))
        # Pad missing columns
        while len(formatted) < max_cols:
            formatted.append('')
        final_data.append(formatted)

    # Calculate column widths proportionally
    page_width = A4[0] - 80  # margins
    col_width = page_width / max_cols

    t = Table(final_data, colWidths=[col_width] * max_cols, repeatRows=1)

    table_styles = [
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_GREEN),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),

        # Body
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 7),
        ('TOPPADDING', (0, 1), (-1, -1), 7),
        ('TEXTCOLOR', (0, 1), (-1, -1), BRAND_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),

        # Borders - subtle
        ('LINEBELOW', (0, 0), (-1, 0), 1.5, BRAND_GREEN_DARK),
        ('LINEBELOW', (0, 1), (-1, -2), 0.5, BRAND_BORDER),
        ('LINEBELOW', (0, -1), (-1, -1), 1, BRAND_BORDER),

        # Rounded corners illusion - left/right borders
        ('LINEBEFORE', (0, 0), (0, -1), 0.5, BRAND_BORDER),
        ('LINEAFTER', (-1, 0), (-1, -1), 0.5, BRAND_BORDER),
        ('LINEABOVE', (0, 0), (-1, 0), 0.5, BRAND_BORDER),
    ]

    # Alternate row shading
    for i in range(1, len(final_data)):
        if i % 2 == 0:
            table_styles.append(
                ('BACKGROUND', (0, i), (-1, i), BRAND_GRAY_LIGHT)
            )

    t.setStyle(TableStyle(table_styles))

    story.append(KeepTogether([t]))
    story.append(Spacer(1, 14))


def generate_pdf_report(content, title="Uniform Agri Report"):
    """
    Generates a professionally styled PDF from markdown content.
    Features: branded header with logo, styled tables, section headings,
    alternating row colors, page numbers, and a branded footer.

    Returns: BytesIO buffer containing the PDF.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=30,
        bottomMargin=50,
        leftMargin=40,
        rightMargin=40,
        title=title,
        author='4Genetics',
    )

    styles = _build_styles()
    story = []

    # ── Header ──
    _build_header(story, title, styles)

    # ── Parse Content ──
    lines = content.split('\n')
    table_buffer = []

    for line in lines:
        clean_line = line.strip()

        # Table rows
        if clean_line.startswith('|') and clean_line.endswith('|'):
            table_buffer.append(clean_line)
            continue
        else:
            if table_buffer:
                _process_table(table_buffer, story, styles)
                table_buffer = []

        if not clean_line:
            continue

        # --- Horizontal rule ---
        if clean_line == '---' or clean_line == '***':
            story.append(Spacer(1, 6))
            story.append(HRFlowable(
                width="100%", thickness=0.5, color=BRAND_BORDER,
                spaceAfter=8, spaceBefore=4
            ))
            continue

        # Image: ![alt](url)
        img_match = re.match(r'!\[.*?\]\((.*?)\)', clean_line)
        if img_match:
            img_url = img_match.group(1)
            try:
                resp = requests.get(img_url, timeout=5)
                if resp.status_code == 200:
                    img_data = BytesIO(resp.content)
                    img = RLImage(img_data)
                    max_width = 5 * inch
                    if img.drawWidth > max_width:
                        ratio = max_width / img.drawWidth
                        img.drawHeight = img.drawHeight * ratio
                        img.drawWidth = max_width
                    story.append(img)
                    story.append(Spacer(1, 12))
                else:
                    story.append(Paragraph(
                        f'<i>[Image not available]</i>', styles['BodyPremium']
                    ))
            except Exception:
                story.append(Paragraph(
                    f'<i>[Image could not be loaded]</i>', styles['BodyPremium']
                ))
            continue

        # Headings
        if clean_line.startswith('### '):
            story.append(Paragraph(clean_line[4:], styles['SubHeading']))
        elif clean_line.startswith('## '):
            # Section heading with green accent
            story.append(Spacer(1, 4))
            story.append(Paragraph(clean_line[3:], styles['SectionHeading']))
            story.append(HRFlowable(
                width="100%", thickness=1, color=BRAND_GREEN_LIGHT,
                spaceAfter=6, spaceBefore=2
            ))
        elif clean_line.startswith('# '):
            story.append(Paragraph(clean_line[2:], styles['ReportTitle']))
            story.append(Spacer(1, 4))
        elif clean_line.startswith('- ') or clean_line.startswith('* '):
            bullet_text = clean_line[2:]
            formatted = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', bullet_text)
            story.append(Paragraph(
                f'<bullet>&bull;</bullet> {formatted}',
                styles['BulletItem']
            ))
        else:
            # Regular text with bold support
            formatted_line = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', clean_line)
            story.append(Paragraph(formatted_line, styles['BodyPremium']))

        story.append(Spacer(1, 3))

    # Trailing table
    if table_buffer:
        _process_table(table_buffer, story, styles)

    # ── Build with footer ──
    doc.build(story, onFirstPage=_build_footer, onLaterPages=_build_footer)
    buffer.seek(0)
    return buffer


# ─────────────────────────────────────────────────────────────────
# Formal Invoice / Quotation Generator
# Matches the professional layout used in official 4Genetics docs
# ─────────────────────────────────────────────────────────────────

def _build_formal_header(story, styles, invoice, doc_number, issue_date, valid_until):
    """Build the clean formal header block matching official 4Genetics quotation style."""
    page_w = A4[0] - 80  # usable width

    # ── Top: company name + document type ──
    company_style = ParagraphStyle(
        'Company', fontName='Helvetica-Bold', fontSize=14,
        textColor=BRAND_GRAY, leading=18, alignment=TA_LEFT
    )
    doc_type_style = ParagraphStyle(
        'DocType', fontName='Helvetica', fontSize=11,
        textColor=BRAND_GRAY_MEDIUM, leading=14, alignment=TA_LEFT
    )

    # Logo  +  company block side by side
    if os.path.exists(LOGO_PATH):
        logo = RLImage(LOGO_PATH)
        target_h = 0.80 * inch
        ratio = target_h / logo.drawHeight
        logo.drawHeight = target_h
        logo.drawWidth = logo.drawWidth * ratio
        logo_cell = logo
    else:
        logo_cell = Paragraph('<b>4Genetics</b>', company_style)

    company_block = [
        Paragraph('<b>4GENETICS FOR IMPORT AND EXPORT</b>', company_style),
        Paragraph(invoice.invoice_type, doc_type_style),
    ]

    header_data = [[logo_cell, company_block]]
    header_table = Table(header_data, colWidths=[1.3 * inch, page_w - 1.3 * inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'LEFT'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width='100%', thickness=2.5, color=BRAND_GREEN,
                             spaceAfter=10, spaceBefore=2))

    # ── Info block: Quotation For, Subject, Number, Dates ──
    info_style = ParagraphStyle(
        'Info', fontName='Helvetica', fontSize=10,
        textColor=BRAND_GRAY, leading=16
    )
    info_bold = ParagraphStyle(
        'InfoBold', fontName='Helvetica-Bold', fontSize=10,
        textColor=BRAND_GRAY, leading=16
    )

    subject_text = 'UNIFORM-Agri Dairy Farm Management Software'
    # Adapt "For" vs "To" label
    is_invoice = invoice.invoice_type in ('Purchase Invoice', 'Renewal Invoice')
    for_label = 'Invoice To' if is_invoice else 'Quotation For'

    info_rows = [
        [Paragraph(for_label + ':', info_style),
         Paragraph(f'<b>{invoice.client.farm_name}</b>', info_bold)],
        [Paragraph('Subject:', info_style),
         Paragraph(subject_text, info_style)],
        [Paragraph('Document Number:', info_style),
         Paragraph(f'<b>[{doc_number}]</b>', info_bold)],
        [Paragraph('Issue Date:', info_style),
         Paragraph(f'<b>{issue_date}</b>', info_bold)],
    ]
    if valid_until:
        info_rows.append([
            Paragraph('Valid Until:', info_style),
            Paragraph(f'<b>{valid_until}</b>', info_bold),
        ])

    info_table = Table(info_rows, colWidths=[1.5 * inch, page_w - 1.5 * inch])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 14))


def _build_formal_footer(canvas, doc, invoice):
    """Draw formal company footer with contact info."""
    canvas.saveState()
    page_w, page_h = A4
    left = 40
    right = page_w - 40

    # Green separator line
    canvas.setStrokeColor(BRAND_GREEN)
    canvas.setLineWidth(1.5)
    canvas.line(left, 80, right, 80)

    # Company contact block
    canvas.setFont('Helvetica-Bold', 8)
    canvas.setFillColor(BRAND_GRAY)
    canvas.drawString(left, 68, '4GENETICS FOR IMPORT AND EXPORT')

    canvas.setFont('Helvetica', 7.5)
    canvas.setFillColor(BRAND_GRAY_MEDIUM)
    canvas.drawString(left, 57, 'Mohamed Magdy Badr')
    canvas.drawString(left, 47, 'Mobile: 01010041678')
    canvas.drawString(left, 37, 'Email: mohamedbadr@4genetics.org')
    canvas.drawString(left, 27, 'Website: www.4genetics.org')

    # Page number right-aligned
    canvas.setFont('Helvetica', 7.5)
    canvas.drawRightString(right, 47, f'Page {doc.page}')

    canvas.restoreState()


def generate_formal_invoice_pdf(invoice):
    """
    Generate a professional formal PDF for Purchase Invoice,
    Renewal Invoice, or Purchase Quotation — matching the official
    4Genetics quotation layout.

    Args:
        invoice: Django Invoice model instance (with is_dairylive, invoice_type,
                 selected_modules, client, etc.)
    Returns:
        BytesIO buffer containing the PDF.
    """
    from decimal import Decimal

    buffer = BytesIO()

    # ── Document number prefix ──
    prefix_map = {
        'Purchase Quotation': 'QT',
        'Purchase Invoice': 'INV',
        'Renewal Invoice': 'REN',
    }
    prefix = prefix_map.get(invoice.invoice_type, 'DOC')
    issue_dt = invoice.created_at
    doc_number = f'{prefix}-{issue_dt.year}-{invoice.id}'
    issue_date = issue_dt.strftime('%B %d, %Y')

    # Only quotations have a "Valid Until"
    valid_until = None
    if invoice.invoice_type == 'Purchase Quotation':
        from datetime import timedelta
        valid_dt = issue_dt + timedelta(days=7)
        valid_until = valid_dt.strftime('%B %d, %Y')

    # ── Currency & exchange rate ──
    inv_currency = getattr(invoice, 'currency', 'EUR')
    rate = getattr(invoice, 'exchange_rate', None)
    use_egp = inv_currency == 'EGP' and rate

    def to_display(eur_amount):
        """Convert EUR amount to display string in the invoice currency."""
        if use_egp:
            converted = (eur_amount * Decimal(str(rate))).quantize(Decimal('0.01'))
            return f'{converted} EGP'
        return f'€{eur_amount}'

    curr_label = 'EGP (Egyptian Pound)' if use_egp else 'EUR (Euro \u20ac)'

    # ── Pricing helpers ──
    is_renewal = invoice.invoice_type == 'Renewal Invoice'
    is_dairylive = getattr(invoice, 'is_dairylive', False)

    def get_cost(mod):
        return mod.renewal_price if is_renewal else mod.purchase_price

    def get_customer_price(mod):
        if is_renewal:
            return mod.renewal_customer_price
        price = mod.purchase_customer_price
        if is_dairylive:
            price = (price * Decimal('0.5')).quantize(Decimal('0.01'))
        return price

    # ── ReportLab setup ──
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=30,
        bottomMargin=100,  # room for formal footer
        leftMargin=40,
        rightMargin=40,
        title=f'{invoice.invoice_type} {doc_number}',
        author='4Genetics',
    )

    styles = _build_styles()
    story = []

    # ── Header ──
    _build_formal_header(story, styles, invoice, doc_number, issue_date, valid_until)

    # ── Section: Software Details ──
    section_style = ParagraphStyle(
        'FormalSection', fontName='Helvetica-Bold', fontSize=13,
        textColor=BRAND_GREEN_DARK, leading=18, spaceBefore=12, spaceAfter=8,
    )
    story.append(Paragraph('Software Details', section_style))
    story.append(HRFlowable(width='100%', thickness=1.5, color=BRAND_GREEN,
                             spaceAfter=12, spaceBefore=0))

    # ── Modules table: Product/Service | Description | Price ──
    modules = invoice.selected_modules.all()

    cell_style = ParagraphStyle('TC', fontName='Helvetica', fontSize=10,
                                textColor=BRAND_GRAY, leading=14)
    cell_bold = ParagraphStyle('TCB', fontName='Helvetica-Bold', fontSize=10,
                               textColor=BRAND_GRAY, leading=14)
    header_cell = ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=10,
                                 textColor=WHITE, leading=14,
                                 alignment=TA_CENTER)
    price_cell = ParagraphStyle('Price', fontName='Helvetica-Bold', fontSize=11,
                                textColor=BRAND_GRAY, leading=14,
                                alignment=TA_CENTER)

    # Build description bullet content for each module
    def make_description(mod):
        bullets = []
        if mod.description:
            # Split description lines into bullet points
            for line in mod.description.split('\n'):
                line = line.strip().lstrip('- ').strip()
                if line:
                    bullets.append(line)
        if not bullets:
            bullets = ['Professional software support', 'Technical assistance included']
        items = '\n'.join(f'• {b}' for b in bullets)
        return Paragraph(items, cell_style)

    table_data = [[
        Paragraph('<b>Product / Service</b>', header_cell),
        Paragraph('<b>Description</b>', header_cell),
        Paragraph('<b>Price</b>', header_cell),
    ]]

    total = Decimal('0')
    for mod in modules:
        cust = get_customer_price(mod)
        total += cust
        table_data.append([
            Paragraph(f'<b>{mod.name}</b>', cell_bold),
            make_description(mod),
            Paragraph(f'<b>{to_display(cust)}</b>', price_cell),
        ])

    # If DairyLive discount, note it
    if is_dairylive and not is_renewal:
        table_data.append([
            Paragraph('', cell_style),
            Paragraph('<i>DairyLive Customer — 50% discount applied</i>', cell_style),
            Paragraph('', cell_style),
        ])

    livestock = invoice.livestock_selection.all()
    # Calculate total in EUR manually from the DB models to avoid double-conversion
    eur_total = Decimal('0')
    for mod in modules:
        eur_total += get_customer_price(mod)
        
    for item in livestock:
        eur_total += Decimal(str(item.price_multiplier)) * Decimal('10.0')

    page_w = A4[0] - 80
    mod_table = Table(table_data, colWidths=[1.8 * inch, page_w - 3.2 * inch, 1.4 * inch],
                      repeatRows=1)
    mod_table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_GREEN_DARK),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        # Body
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        # Borders
        ('LINEBELOW', (0, 0), (-1, 0), 1.5, BRAND_GREEN_DARK),
        ('LINEBELOW', (0, 1), (-1, -2), 0.5, BRAND_BORDER),
        ('LINEBELOW', (0, -1), (-1, -1), 1, BRAND_BORDER),
        ('LINEBEFORE', (0, 0), (0, -1), 0.5, BRAND_BORDER),
        ('LINEAFTER', (-1, 0), (-1, -1), 0.5, BRAND_BORDER),
        ('LINEABOVE', (0, 0), (-1, 0), 0.5, BRAND_BORDER),
        # Price column alignment
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        # Alternate shading
        *[('BACKGROUND', (0, i), (-1, i), BRAND_GRAY_LIGHT)
          for i in range(2, len(table_data), 2)],
    ]))
    story.append(mod_table)
    story.append(Spacer(1, 10))

    # ── Total row ──
    total_style = ParagraphStyle('TotalRight', fontName='Helvetica-Bold', fontSize=14,
                                 textColor=BRAND_GREEN_DARK, alignment=TA_RIGHT)
    label_style = ParagraphStyle('TotalLabel', fontName='Helvetica-Bold', fontSize=12,
                                 textColor=BRAND_GRAY, alignment=TA_RIGHT)
    total_data = [[
        Paragraph('Total Amount:', label_style),
        Paragraph(f'<b>{to_display(eur_total)}</b>', total_style),
    ]]
    total_table = Table(total_data, colWidths=[page_w - 2 * inch, 2 * inch])
    total_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0fdf4')), # very light green highlight
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('LINEABOVE', (0, 0), (-1, 0), 2, BRAND_GREEN_DARK),
        ('LINEBELOW', (0, 0), (-1, 0), 2, BRAND_GREEN_DARK),
    ]))
    story.append(total_table)
    # Exchange rate footnote (EGP only)
    if use_egp:
        rate_note_style = ParagraphStyle('RateNote', fontName='Helvetica', fontSize=7.5,
                                         textColor=BRAND_GRAY_MEDIUM, alignment=TA_RIGHT)
        story.append(Paragraph(
            f'* Exchange rate used: 1 € = {rate} EGP (as of {invoice.created_at.strftime("%Y-%m-%d")})',
            rate_note_style
        ))
    story.append(Spacer(1, 18))

    # ── Terms & Conditions ──
    story.append(Paragraph('Terms &amp; Conditions', section_style))
    story.append(HRFlowable(width='100%', thickness=1, color=BRAND_GREEN_LIGHT,
                             spaceAfter=8, spaceBefore=0))

    tc_body = ParagraphStyle('TCBody', fontName='Helvetica', fontSize=9,
                             textColor=BRAND_GRAY, leading=14)
    tc_bold_label = ParagraphStyle('TCLabel', fontName='Helvetica-Bold', fontSize=9,
                                   textColor=BRAND_GRAY, leading=14)
    tc_bullet = ParagraphStyle('TCBullet', fontName='Helvetica', fontSize=9,
                               textColor=BRAND_GRAY, leading=14,
                               leftIndent=14, spaceAfter=3)

    story.append(Paragraph(f'<b>Currency:</b> Prices are quoted in {curr_label}.', tc_body))
    story.append(Spacer(1, 4))

    if invoice.invoice_type == 'Purchase Quotation':
        story.append(Paragraph(
            '<b>Validity:</b> This offer is valid for one week from the issue date.',
            tc_body
        ))
        story.append(Spacer(1, 4))

    if not use_egp:
        story.append(Paragraph(
            '<b>Local Payment:</b> If payment is made in Egyptian Pounds (EGP), an additional '
            '10% will be added to the official bank exchange rate on the day of payment.',
            tc_body
        ))
        story.append(Spacer(1, 6))

    story.append(Paragraph('<b>Inclusions:</b> The quoted price includes:', tc_body))
    story.append(Spacer(1, 4))

    inclusions = [
        'One year of technical support',
        'Two online training sessions',
    ]
    for item in inclusions:
        # Green bullet square (■)
        story.append(Paragraph(f'<font color="#16a34a">■</font>  {item}', tc_bullet))

    if invoice.notes:
        story.append(Spacer(1, 8))
        story.append(Paragraph(f'<b>Notes:</b> {invoice.notes}', tc_body))

    # ── Build PDF ──
    def footer_cb(canvas, doc):
        _build_formal_footer(canvas, doc, invoice)

    doc.build(story, onFirstPage=footer_cb, onLaterPages=footer_cb)
    buffer.seek(0)
    return buffer

