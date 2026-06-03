"""
Webhook alerts — Discord, Slack, generic HTTP.

Cooldown: one alert per category per WEBHOOK_COOLDOWN_SECONDS.
Anti-spam: last_sent tracked in memory (persists until process restart).
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

import httpx

from app.config import get_settings
from app.schemas.rage import RageTriggerRequest

log = logging.getLogger(__name__)
settings = get_settings()

# category → last sent time
_cooldown_tracker: dict[str, datetime] = {}

CATEGORY_EMOJI = {
    "bug": "🐛",
    "lag": "⚡",
    "frustration": "😤",
    "exploit": "🔓",
    "ui_ux": "🎨",
    "performance": "📊",
    "other": "❓",
}

SEVERITY_COLOR = {
    "low": 0x6B7280,
    "medium": 0xF59E0B,
    "high": 0xF97316,
    "critical": 0xEF4444,
}


def _is_on_cooldown(category: str) -> bool:
    last = _cooldown_tracker.get(category)
    if last is None:
        return False
    return datetime.utcnow() - last < timedelta(seconds=settings.webhook_cooldown_seconds)


def _mark_sent(category: str) -> None:
    _cooldown_tracker[category] = datetime.utcnow()


# ---------------------------------------------------------------------------
# Formatters
# ---------------------------------------------------------------------------

def _discord_payload(
    incident_id: str,
    req: RageTriggerRequest,
    severity: str,
    occurrence_count: int,
) -> dict:
    emoji = CATEGORY_EMOJI.get(req.category, "❓")
    color = SEVERITY_COLOR.get(severity, 0x6B7280)
    first_error = next((l.message for l in req.logs if l.level == "error"), "—")

    embed = {
        "title": f"{emoji} Rage Trigger — {req.category.upper()}",
        "color": color,
        "fields": [
            {"name": "Incident ID", "value": f"`{incident_id}`", "inline": True},
            {"name": "Severity", "value": severity.upper(), "inline": True},
            {"name": "Occurrences", "value": str(occurrence_count), "inline": True},
            {"name": "Page", "value": req.page or "—", "inline": True},
            {"name": "User", "value": req.userId or "anonymous", "inline": True},
            {"name": "FPS", "value": str(req.metrics.fps or "—"), "inline": True},
        ],
        "timestamp": req.timestamp,
        "footer": {"text": "RageTrigger Telemetry"},
    }

    if req.comment:
        embed["description"] = f'> {req.comment[:300]}'

    if first_error != "—":
        embed["fields"].append({"name": "First Error", "value": f"`{first_error[:200]}`", "inline": False})

    return {"embeds": [embed]}


def _slack_payload(
    incident_id: str,
    req: RageTriggerRequest,
    severity: str,
    occurrence_count: int,
) -> dict:
    emoji = CATEGORY_EMOJI.get(req.category, "❓")
    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": f"{emoji} Rage Trigger — {req.category.upper()}"},
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Incident:* `{incident_id}`"},
                {"type": "mrkdwn", "text": f"*Severity:* {severity.upper()}"},
                {"type": "mrkdwn", "text": f"*Page:* {req.page or '—'}"},
                {"type": "mrkdwn", "text": f"*Occurrences:* {occurrence_count}"},
                {"type": "mrkdwn", "text": f"*FPS:* {req.metrics.fps or '—'}"},
                {"type": "mrkdwn", "text": f"*User:* {req.userId or 'anonymous'}"},
            ],
        },
    ]
    if req.comment:
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": f'_{req.comment[:300]}_'},
        })
    return {"blocks": blocks}


def _generic_payload(
    incident_id: str,
    req: RageTriggerRequest,
    severity: str,
    occurrence_count: int,
) -> dict:
    return {
        "incident_id": incident_id,
        "category": req.category,
        "severity": severity,
        "comment": req.comment,
        "page": req.page,
        "user_id": req.userId,
        "occurrence_count": occurrence_count,
        "timestamp": req.timestamp,
        "metrics": req.metrics.model_dump(),
    }


# ---------------------------------------------------------------------------
# Sender
# ---------------------------------------------------------------------------

def _infer_severity(req: RageTriggerRequest) -> str:
    if req.category == "exploit":
        return "critical"
    fps = req.metrics.fps
    if fps is not None and fps < 15:
        return "high"
    if req.category in ("bug", "lag"):
        return "medium"
    return "low"


async def send_webhooks(
    incident_id: str,
    req: RageTriggerRequest,
    occurrence_count: int = 1,
    severity: Optional[str] = None,
) -> None:
    if _is_on_cooldown(req.category):
        log.debug("Webhook cooldown active for category %s", req.category)
        return

    if severity is None:
        severity = _infer_severity(req)

    targets = {
        "discord": (settings.discord_webhook_url, _discord_payload),
        "slack": (settings.slack_webhook_url, _slack_payload),
        "generic": (settings.generic_webhook_url, _generic_payload),
    }

    any_sent = False
    async with httpx.AsyncClient(timeout=10) as client:
        for target, (url, formatter) in targets.items():
            if not url:
                continue
            payload = formatter(incident_id, req, severity, occurrence_count)
            try:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                log.info("Webhook sent to %s for incident %s", target, incident_id)
                any_sent = True
            except Exception as exc:
                log.warning("Webhook %s failed: %s", target, exc)

    if any_sent:
        _mark_sent(req.category)
