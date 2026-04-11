import io
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from database import get_db
from models import Invoice, Patient, Appointment, Treatment
from schemas import InvoiceCreate, InvoiceUpdate, InvoiceResponse
from deps import get_current_user

router = APIRouter(
    prefix="/billing",
    tags=["Billing"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/", response_model=InvoiceResponse, status_code=201)
def create_invoice(invoice: InvoiceCreate, db: Session = Depends(get_db)):
    if not db.query(Patient).filter(Patient.id == invoice.patient_id).first():
        raise HTTPException(status_code=404, detail="Patient not found")
    db_invoice = Invoice(**invoice.model_dump())
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    return db_invoice


@router.get("/", response_model=List[InvoiceResponse])
def get_invoices(
    skip: int = 0,
    limit: int = 100,
    patient_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Invoice)
    if patient_id:
        query = query.filter(Invoice.patient_id == patient_id)
    if status:
        query = query.filter(Invoice.status == status)
    return query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.patch("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(invoice_id: int, updates: InvoiceUpdate, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(invoice, field, value)
    db.commit()
    db.refresh(invoice)
    return invoice


@router.patch("/{invoice_id}/pay", response_model=InvoiceResponse)
def mark_paid(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice.status = "paid"
    invoice.paid_at = datetime.utcnow()
    db.commit()
    db.refresh(invoice)
    return invoice


@router.delete("/{invoice_id}", status_code=204)
def delete_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    db.delete(invoice)
    db.commit()


@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(invoice_id: int, db: Session = Depends(get_db)):
    """Generate and download a PDF for an invoice."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    patient = db.query(Patient).filter(Patient.id == invoice.patient_id).first()
    treatments = []
    if invoice.appointment_id:
        treatments = db.query(Treatment).filter(Treatment.appointment_id == invoice.appointment_id).all()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=20*mm, bottomMargin=20*mm)
    styles = getSampleStyleSheet()
    story = []

    # Header
    header_style = ParagraphStyle('header', parent=styles['Normal'], fontSize=22, textColor=colors.HexColor('#1e40af'), spaceAfter=2)
    sub_style = ParagraphStyle('sub', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#64748b'), spaceAfter=16)
    story.append(Paragraph("Dental Clinic", header_style))
    story.append(Paragraph("Management System", sub_style))

    # Invoice title
    inv_style = ParagraphStyle('inv', parent=styles['Normal'], fontSize=16, textColor=colors.HexColor('#0f172a'), spaceAfter=4)
    story.append(Paragraph(f"INVOICE  INV-{str(invoice_id).zfill(4)}", inv_style))

    status_color = '#16a34a' if invoice.status == 'paid' else '#dc2626'
    story.append(Paragraph(f"<font color='{status_color}'><b>{invoice.status.upper()}</b></font>", styles['Normal']))
    story.append(Spacer(1, 8*mm))

    # Patient + dates
    info_data = [
        ['Bill To', 'Invoice Details'],
        [patient.name if patient else f'Patient #{invoice.patient_id}', f'Invoice #: INV-{str(invoice_id).zfill(4)}'],
        [patient.email or '', f'Created: {invoice.created_at.strftime("%d %b %Y") if invoice.created_at else "—"}'],
        [patient.phone or '', f'Due Date: {invoice.due_date or "—"}'],
        ['', f'Paid At: {invoice.paid_at.strftime("%d %b %Y") if invoice.paid_at else "—"}'],
    ]
    info_table = Table(info_data, colWidths=[85*mm, 85*mm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#64748b')),
        ('FONTSIZE', (0,1), (-1,-1), 10),
        ('TEXTCOLOR', (0,1), (0,1), colors.HexColor('#0f172a')),
        ('FONTNAME', (0,1), (0,1), 'Helvetica-Bold'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 8*mm))

    # Treatments table
    if treatments:
        story.append(Paragraph("Treatments", ParagraphStyle('th', parent=styles['Normal'], fontSize=11, textColor=colors.HexColor('#0f172a'), fontName='Helvetica-Bold', spaceAfter=4)))
        t_data = [['Procedure', 'Tooth #', 'Description', 'Cost']]
        for t in treatments:
            t_data.append([
                t.procedure_type,
                str(t.tooth_number) if t.tooth_number else '—',
                t.description or '—',
                f'${t.cost:.2f}',
            ])
        t_table = Table(t_data, colWidths=[50*mm, 25*mm, 65*mm, 30*mm])
        t_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('ALIGN', (3,0), (3,-1), 'RIGHT'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(t_table)
        story.append(Spacer(1, 6*mm))

    # Total
    total_data = [['', 'TOTAL AMOUNT', f'${invoice.total_amount:.2f}']]
    total_table = Table(total_data, colWidths=[85*mm, 55*mm, 30*mm])
    total_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 12),
        ('TEXTCOLOR', (1,0), (1,0), colors.HexColor('#0f172a')),
        ('TEXTCOLOR', (2,0), (2,0), colors.HexColor('#1e40af')),
        ('ALIGN', (1,0), (2,0), 'RIGHT'),
        ('LINEABOVE', (1,0), (2,0), 1, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(total_table)

    if invoice.notes:
        story.append(Spacer(1, 6*mm))
        story.append(Paragraph(f"<i>Notes: {invoice.notes}</i>", ParagraphStyle('note', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor('#64748b'))))

    doc.build(story)
    buffer.seek(0)
    filename = f"INV-{str(invoice_id).zfill(4)}.pdf"
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})
