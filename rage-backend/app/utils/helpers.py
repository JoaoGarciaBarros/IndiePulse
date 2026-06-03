"""Misc helpers."""

import re
from datetime import datetime


def parse_timestamp(ts: str) -> datetime:
    """Parse ISO 8601 to naive UTC datetime."""
    ts = ts.replace("Z", "+00:00")
    dt = datetime.fromisoformat(ts)
    return dt.replace(tzinfo=None)


def sanitize_filename(name: str) -> str:
    return re.sub(r"[^\w\-.]", "_", name)[:64]
