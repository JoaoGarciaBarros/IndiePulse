"""
PII scrubbing and screenshot anonymization.
Enabled via PRIVACY_SCRUB_PII and PRIVACY_BLUR_SCREENSHOTS env vars.
"""

import re
import base64
import io
from typing import Any

_EMAIL_RE = re.compile(r"[\w.+\-]+@[\w\-]+\.[\w.\-]+", re.IGNORECASE)
_IP_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
_PHONE_RE = re.compile(r"(?:\+?\d[\s\-.]?){7,15}")
_JWT_RE = re.compile(r"eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+")
_API_KEY_RE = re.compile(r"(?:api[_-]?key|token|secret|password)\s*[:=]\s*\S+", re.IGNORECASE)


def scrub_text(text: str) -> str:
    text = _EMAIL_RE.sub("[EMAIL]", text)
    text = _IP_RE.sub("[IP]", text)
    text = _JWT_RE.sub("[JWT]", text)
    text = _API_KEY_RE.sub("[REDACTED]", text)
    return text


def scrub_dict(data: dict[str, Any]) -> dict[str, Any]:
    """Recursively scrub PII from dict values."""
    sensitive_keys = {"email", "password", "token", "secret", "api_key", "apikey", "auth"}
    result: dict[str, Any] = {}
    for k, v in data.items():
        if any(sk in k.lower() for sk in sensitive_keys):
            result[k] = "[REDACTED]"
        elif isinstance(v, str):
            result[k] = scrub_text(v)
        elif isinstance(v, dict):
            result[k] = scrub_dict(v)
        elif isinstance(v, list):
            result[k] = [scrub_text(i) if isinstance(i, str) else i for i in v]
        else:
            result[k] = v
    return result


def blur_screenshot_b64(b64_data: str, blur_radius: int = 10) -> str:
    """Blur a base64 screenshot using Pillow. Returns blurred base64."""
    try:
        from PIL import Image, ImageFilter

        raw = _decode_b64(b64_data)
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        blurred = img.filter(ImageFilter.GaussianBlur(radius=blur_radius))

        out = io.BytesIO()
        blurred.save(out, format="JPEG", quality=80)
        return base64.b64encode(out.getvalue()).decode()
    except Exception:
        return b64_data


def _decode_b64(data: str) -> bytes:
    if "," in data:
        data = data.split(",", 1)[1]
    return base64.b64decode(data + "==")
