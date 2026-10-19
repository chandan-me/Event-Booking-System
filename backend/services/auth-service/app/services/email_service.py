import abc
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


def render_otp_email_html(otp: str, purpose: str, expiry_minutes: int) -> str:
    """Generate responsive, clean HTML email template for OTP delivery."""
    action_title = "Verify Your Email" if purpose == "VERIFY_EMAIL" else "Reset Your Password"
    action_desc = (
        "Thank you for registering. Please enter the verification code below to activate your account."
        if purpose == "VERIFY_EMAIL"
        else "We received a request to reset your password. Enter the code below to proceed."
    )

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; }}
        .container {{ max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }}
        .header {{ background: #1976d2; color: #ffffff; padding: 28px; text-align: center; }}
        .header h1 {{ margin: 0; font-size: 24px; font-weight: 600; }}
        .content {{ padding: 32px 28px; color: #333333; line-height: 1.6; }}
        .otp-box {{ background: #f0f4f8; border: 2px dashed #1976d2; border-radius: 8px; text-align: center; padding: 18px; margin: 24px 0; }}
        .otp-code {{ font-size: 34px; font-weight: 700; letter-spacing: 6px; color: #0d47a1; margin: 0; }}
        .footer {{ background: #fafafa; border-top: 1px solid #eeeeee; padding: 16px; text-align: center; font-size: 12px; color: #777777; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>{action_title}</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>{action_desc}</p>
          <div class="otp-box">
            <div class="otp-code">{otp}</div>
          </div>
          <p>This single-use code expires in <strong>{expiry_minutes} minutes</strong>. If you did not request this code, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          Event Booking System &copy; 2026. Automated Security Notification.
        </div>
      </div>
    </body>
    </html>
    """


class BaseEmailService(abc.ABC):
    @abc.abstractmethod
    def send_otp_email(self, recipient: str, otp: str, purpose: str) -> bool:
        pass


class MailpitEmailService(BaseEmailService):
    """
    Dedicated email delivery service routing all verification and security OTPs
    exclusively to Mailpit SMTP (Port 1025) and Web Inbox (Port 8025).
    """
    def __init__(
        self,
        host: str = settings.SMTP_HOST,
        port: int = settings.SMTP_PORT,
        username: str = settings.SMTP_USERNAME,
        password: str = settings.SMTP_PASSWORD,
        from_email: str = settings.SMTP_FROM_EMAIL,
        use_tls: bool = settings.SMTP_USE_TLS
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.from_email = from_email
        self.use_tls = use_tls

    def send_otp_email(self, recipient: str, otp: str, purpose: str) -> bool:
        subject = "Your Verification Code" if purpose == "VERIFY_EMAIL" else "Password Reset Request"
        html_content = render_otp_email_html(otp, purpose, settings.OTP_EXPIRE_MINUTES)

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.from_email
        msg["To"] = recipient

        # Plain text fallback
        plain_text = f"Your verification code is: {otp}. It expires in {settings.OTP_EXPIRE_MINUTES} minutes."
        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        try:
            with smtplib.SMTP(self.host, self.port, timeout=10) as server:
                if self.use_tls:
                    server.starttls()
                if self.username and self.password and self.username not in ("dev_smtp_user", ""):
                    try:
                        server.login(self.username, self.password)
                    except Exception:
                        pass
                server.send_message(msg)
            logger.info("Successfully dispatched OTP email to %s via Mailpit SMTP (%s:%d). View at http://localhost:8025", recipient, self.host, self.port)
            return True
        except Exception as e:
            logger.error("Mailpit SMTP delivery failed for %s to %s:%d: %s", recipient, self.host, self.port, str(e))
            return False


# Alias for backward compatibility
SMTPEmailService = MailpitEmailService


class FakeEmailService(BaseEmailService):
    """In-memory fake email backend for deterministic local testing."""
    def __init__(self):
        self.sent_emails: list[dict] = []

    def send_otp_email(self, recipient: str, otp: str, purpose: str) -> bool:
        self.sent_emails.append({
            "recipient": recipient,
            "otp": otp,
            "purpose": purpose
        })
        masked_otp = f"{otp[:2]}***{otp[-1]}" if len(otp) >= 3 else "***"
        logger.info("[FAKE_MAILER] Dispatched OTP %s to %s for %s", masked_otp, recipient, purpose)
        return True

    def get_last_otp(self, recipient: str) -> str | None:
        for mail in reversed(self.sent_emails):
            if mail["recipient"] == recipient:
                return mail["otp"]
        return None
