import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_FROM = os.getenv("SMTP_FROM", "noreply@dentalclinic.com")


def _is_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASS)


def send_email(to: str, subject: str, body_html: str) -> bool:
    """Send an email. Returns True on success, False if not configured or on error."""
    if not _is_configured():
        logger.info("SMTP not configured — skipping email to %s", to)
        return False
    if not to:
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to
        msg.attach(MIMEText(body_html, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_FROM, to, msg.as_string())
        logger.info("Email sent to %s: %s", to, subject)
        return True
    except Exception as e:
        logger.warning("Failed to send email to %s: %s", to, e)
        return False


def send_appointment_confirmation(patient_name: str, patient_email: str, appointment_date: datetime, reason: str | None, doctor_name: str):
    date_str = appointment_date.strftime("%A, %B %d %Y at %I:%M %p")
    body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #2563eb; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 22px;">Appointment Confirmed</h1>
        <p style="color: #bfdbfe; margin: 4px 0 0;">Dental Clinic Management System</p>
      </div>
      <div style="background: #f8fafc; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
        <p style="color: #475569;">Hi <strong>{patient_name}</strong>,</p>
        <p style="color: #475569;">Your appointment has been confirmed. Here are the details:</p>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px;"><strong style="color: #1e293b;">Date & Time:</strong> <span style="color: #475569;">{date_str}</span></p>
          <p style="margin: 0 0 8px;"><strong style="color: #1e293b;">Doctor:</strong> <span style="color: #475569;">Dr. {doctor_name}</span></p>
          <p style="margin: 0;"><strong style="color: #1e293b;">Reason:</strong> <span style="color: #475569;">{reason or 'General appointment'}</span></p>
        </div>
        <p style="color: #64748b; font-size: 14px;">If you need to cancel or reschedule, please contact us as soon as possible.</p>
        <p style="color: #64748b; font-size: 14px; margin-top: 24px;">Thank you,<br><strong>Dental Clinic Team</strong></p>
      </div>
    </div>
    """
    send_email(patient_email, "Appointment Confirmed — Dental Clinic", body)


def send_appointment_cancellation(patient_name: str, patient_email: str, appointment_date: datetime, reason: str | None):
    date_str = appointment_date.strftime("%A, %B %d %Y at %I:%M %p")
    body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #dc2626; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 22px;">Appointment Cancelled</h1>
        <p style="color: #fecaca; margin: 4px 0 0;">Dental Clinic Management System</p>
      </div>
      <div style="background: #f8fafc; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
        <p style="color: #475569;">Hi <strong>{patient_name}</strong>,</p>
        <p style="color: #475569;">Your appointment scheduled for <strong>{date_str}</strong> ({reason or 'General appointment'}) has been cancelled.</p>
        <p style="color: #64748b; font-size: 14px;">Please contact us to book a new appointment.</p>
        <p style="color: #64748b; font-size: 14px; margin-top: 24px;">Thank you,<br><strong>Dental Clinic Team</strong></p>
      </div>
    </div>
    """
    send_email(patient_email, "Appointment Cancelled — Dental Clinic", body)
