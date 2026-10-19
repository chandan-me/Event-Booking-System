import abc
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


class BaseEmailSender(abc.ABC):
    @abc.abstractmethod
    def send_html_email(self, recipient: str, subject: str, html_body: str) -> bool:
        pass


class SMTPEmailSender(BaseEmailSender):
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

    def send_html_email(self, recipient: str, subject: str, html_body: str) -> bool:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.from_email
        msg["To"] = recipient

        # Fallback text
        msg.attach(MIMEText("Please view this notification in an HTML-compatible email client.", "plain"))
        msg.attach(MIMEText(html_body, "html"))

        try:
            with smtplib.SMTP(self.host, self.port, timeout=10) as server:
                if self.use_tls:
                    server.starttls()
                if self.username and self.password and self.username != "dev_smtp_user":
                    server.login(self.username, self.password)
                server.send_message(msg)
            logger.info("Email '%s' delivered to %s via SMTP (%s:%d)", subject, recipient, self.host, self.port)
            return True
        except Exception as e:
            logger.warning("SMTP delivery failed for %s to %s: %s", subject, recipient, str(e))
            return False


class FakeEmailSender(BaseEmailSender):
    """In-memory test mailer."""
    def __init__(self):
        self.outbox: list[dict] = []

    def send_html_email(self, recipient: str, subject: str, html_body: str) -> bool:
        self.outbox.append({
            "recipient": recipient,
            "subject": subject,
            "html_body": html_body
        })
        logger.info("[FAKE_MAILER] Delivered '%s' to %s", subject, recipient)
        return True

    def get_last_email_for(self, recipient: str) -> dict | None:
        for mail in reversed(self.outbox):
            if mail["recipient"] == recipient:
                return mail
        return None
