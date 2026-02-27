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
    """Build a branded header with dual logos and title."""
    # ── Left Logo (4Genetics) ──
    if os.path.exists(LOGO_PATH):
        left_logo = RLImage(LOGO_PATH)
        target_h = 0.85 * inch
        ratio = target_h / left_logo.drawHeight
        left_logo.drawHeight = target_h
        left_logo.drawWidth = left_logo.drawWidth * ratio
        left_cell = left_logo
    else:
        left_cell = Paragraph('<b>4Genetics</b>', styles['ReportTitle'])

    # ── Right Logo (Uniform Agri) ──
    if os.path.exists(LOGO_RIGHT_PATH):
        right_logo = RLImage(LOGO_RIGHT_PATH)
        target_h = 0.85 * inch
        ratio = target_h / right_logo.drawHeight
        right_logo.drawHeight = target_h
        right_logo.drawWidth = right_logo.drawWidth * ratio
        right_cell = right_logo
    else:
        right_cell = Paragraph('<b>Uniform Agri</b>', styles['ReportTitle'])

    # ── Title + date (center) ──
    now = datetime.now()
    title_block = [
        Paragraph(title, styles['ReportTitle']),
        Paragraph(
            f'Generated on {now.strftime("%B %d, %Y at %I:%M %p")}',
            styles['ReportSubtitle']
        ),
    ]

    header_data = [[left_cell, title_block, right_cell]]

    header_table = Table(header_data, colWidths=[1.4 * inch, 3.7 * inch, 1.4 * inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'LEFT'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
        ('LEFTPADDING', (0, 0), (0, 0), 0),
        ('LEFTPADDING', (1, 0), (1, 0), 12),
        ('RIGHTPADDING', (2, 0), (2, 0), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))

    story.append(header_table)
    story.append(Spacer(1, 6))

    # ── Green accent divider ──
    story.append(HRFlowable(
        width="100%", thickness=3, color=BRAND_GREEN,
        spaceAfter=16, spaceBefore=4
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
