import io
import base64
import logging
from typing import Tuple
import qrcode
from qrcode.constants import ERROR_CORRECT_M

logger = logging.getLogger(__name__)


def generate_qr_code_image_base64(data: str, box_size: int = 8, border: int = 2) -> str:
    """
    Generates a PNG QR code for the provided payload and returns
    a base64 data URI string suitable for inline <img> or HTML emails.
    """
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_M,
        box_size=box_size,
        border=border,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#0f172a", back_color="#ffffff")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    b64_str = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{b64_str}"


def generate_qr_code_bytes(data: str, box_size: int = 8, border: int = 2) -> bytes:
    """Generates a raw PNG bytes stream for email attachments or file downloads."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_M,
        box_size=box_size,
        border=border,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#0f172a", back_color="#ffffff")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.getvalue()
