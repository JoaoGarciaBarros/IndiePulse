"""
Incident deduplication and grouping.

Fingerprint = SHA-256( category + first_error_message_normalized + page )

Similar incidents are grouped so the dashboard shows occurrence counts
instead of hundreds of identical reports.
"""

import hashlib
import re
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.incident import Incident, IncidentGroup
from app.schemas.rage import LogEntry, RageCategory


def _normalize_message(msg: str) -> str:
    """Strip dynamic parts (line numbers, hex addresses, UUIDs) for stable fingerprint."""
    msg = re.sub(r"\b[0-9a-f]{8}-[0-9a-f-]{27}\b", "<uuid>", msg, flags=re.I)
    msg = re.sub(r"0x[0-9a-f]+", "<addr>", msg, flags=re.I)
    msg = re.sub(r"\b\d+\b", "<n>", msg)
    msg = msg.lower().strip()
    return msg[:200]


def build_fingerprint(
    category: str,
    logs: list[LogEntry],
    page: str,
) -> str:
    first_error = next(
        (l.message for l in logs if l.level == "error"),
        logs[0].message if logs else "",
    )
    normalized = _normalize_message(first_error)
    raw = f"{category}|{normalized}|{page}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def _make_title(category: str, logs: list[LogEntry], comment: str) -> str:
    first_error = next((l.message for l in logs if l.level == "error"), None)
    if first_error:
        return first_error[:80]
    if comment:
        return comment[:80]
    return f"{category.upper()} incident"


async def find_or_create_group(
    db: AsyncSession,
    fingerprint: str,
    category: str,
    logs: list[LogEntry],
    comment: str,
    now: datetime,
) -> tuple[IncidentGroup, bool]:
    """Return (group, is_new). Increments occurrence_count if existing."""
    result = await db.execute(
        select(IncidentGroup).where(IncidentGroup.fingerprint == fingerprint)
    )
    group: Optional[IncidentGroup] = result.scalar_one_or_none()

    if group:
        group.occurrence_count += 1
        group.last_seen = now
        return group, False

    group = IncidentGroup(
        fingerprint=fingerprint,
        category=category,
        title=_make_title(category, logs, comment),
        occurrence_count=1,
        first_seen=now,
        last_seen=now,
    )
    db.add(group)
    await db.flush()
    return group, True
