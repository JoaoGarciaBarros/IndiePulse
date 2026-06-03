"""
Core incident lifecycle: create, store evidence, link replay.
"""

import base64
import io
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.incident import Incident
from app.schemas.rage import RageTriggerRequest, RageTriggerResponse
from app.services import dedupe_service, privacy_service, replay_service, webhook_service

log = logging.getLogger(__name__)
settings = get_settings()


# ---------------------------------------------------------------------------
# Evidence storage helpers
# ---------------------------------------------------------------------------

def _incident_dir(incident_id: str) -> Path:
    return Path(settings.incidents_dir) / incident_id


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


async def _save_screenshot(incident_dir: Path, b64_data: str) -> Optional[str]:
    try:
        from PIL import Image

        if settings.privacy_blur_screenshots:
            b64_data = privacy_service.blur_screenshot_b64(b64_data)

        if "," in b64_data:
            b64_data = b64_data.split(",", 1)[1]

        raw = base64.b64decode(b64_data + "==")
        img = Image.open(io.BytesIO(raw)).convert("RGB")

        path = incident_dir / "screenshot.png"
        img.save(str(path), format="PNG", optimize=True)
        return str(path)
    except Exception as exc:
        log.warning("Screenshot save failed: %s", exc)
        return None


def _save_text_evidence(incident_dir: Path, req: RageTriggerRequest) -> None:
    # logs.txt — human-readable
    logs_path = incident_dir / "logs.txt"
    with open(logs_path, "w", encoding="utf-8") as f:
        for entry in req.logs:
            ts = datetime.utcfromtimestamp(entry.timestamp / 1000).isoformat()
            line = f"[{ts}] [{entry.level.upper()}] {entry.message}"
            if entry.stack:
                line += f"\n  Stack: {entry.stack}"
            f.write(line + "\n")

    # metrics.json
    metrics_path = incident_dir / "metrics.json"
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(req.metrics.model_dump(), f, indent=2)

    # metadata.json
    meta_path = incident_dir / "metadata.json"
    meta = req.metadata.copy()
    if settings.privacy_scrub_pii:
        meta = privacy_service.scrub_dict(meta)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, default=str)

    # comment.txt
    if req.comment:
        comment = privacy_service.scrub_text(req.comment) if settings.privacy_scrub_pii else req.comment
        (incident_dir / "comment.txt").write_text(comment, encoding="utf-8")


# ---------------------------------------------------------------------------
# Severity inference
# ---------------------------------------------------------------------------

def _compute_severity(req: RageTriggerRequest, occurrence_count: int) -> str:
    if req.category == "exploit":
        return "critical"
    if occurrence_count >= 10:
        return "critical"
    if occurrence_count >= 5:
        return "high"
    fps = req.metrics.fps
    if fps is not None and fps < 15:
        return "high"
    if req.category in ("bug", "lag") and occurrence_count >= 2:
        return "medium"
    return "low"


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

async def process_rage_trigger(
    req: RageTriggerRequest,
    db: AsyncSession,
) -> RageTriggerResponse:
    now = datetime.utcnow()

    # PII scrub on freetext
    comment = req.comment
    if settings.privacy_scrub_pii and comment:
        comment = privacy_service.scrub_text(comment)

    scrubbed_logs = req.logs
    if settings.privacy_scrub_pii:
        scrubbed_logs = [
            entry.model_copy(update={"message": privacy_service.scrub_text(entry.message)})
            for entry in req.logs
        ]

    # Deduplication
    fingerprint = dedupe_service.build_fingerprint(req.category, req.logs, req.page)
    group, _is_new = await dedupe_service.find_or_create_group(
        db, fingerprint, req.category, req.logs, comment, now
    )

    severity = _compute_severity(req, group.occurrence_count)

    # Build Incident ORM
    incident = Incident(
        timestamp=datetime.fromisoformat(req.timestamp.replace("Z", "+00:00")).replace(tzinfo=None),
        session_id=req.sessionId,
        user_id=req.userId,
        page=req.page,
        category=req.category,
        comment=comment,
        status="open",
        severity=severity,
        fps=req.metrics.fps,
        ping_ms=req.metrics.ping,
        js_heap_mb=req.metrics.jsHeapSize,
        fingerprint=fingerprint,
        group_id=group.id,
        logs_json=json.dumps([l.model_dump() for l in scrubbed_logs]),
        metrics_json=json.dumps(req.metrics.model_dump()),
        metadata_json=json.dumps(
            privacy_service.scrub_dict(req.metadata) if settings.privacy_scrub_pii else req.metadata,
            default=str,
        ),
    )
    db.add(incident)
    await db.flush()  # get id before file ops

    # File storage
    incident_dir = _incident_dir(incident.id)
    _ensure_dir(incident_dir)
    _save_text_evidence(incident_dir, req)

    # Screenshot
    if req.screenshot:
        path = await _save_screenshot(incident_dir, req.screenshot)
        if path:
            incident.screenshot_path = path

    await db.commit()

    # Replay (async, non-blocking — can fail silently)
    replay_path: Optional[str] = None
    if settings.replay_enabled:
        try:
            replay_path = await replay_service.generate_replay(
                incident_dir=str(incident_dir),
                session_id=req.sessionId,
                mode=settings.replay_mode,
                buffer_seconds=settings.replay_buffer_seconds,
                fps=settings.replay_output_fps,
            )
            if replay_path:
                incident.replay_path = replay_path
                await db.commit()
        except Exception as exc:
            log.warning("Replay generation failed: %s", exc)

    # Webhooks (fire-and-forget)
    try:
        await webhook_service.send_webhooks(
            incident_id=incident.id,
            req=req,
            occurrence_count=group.occurrence_count,
            severity=severity,
        )
    except Exception as exc:
        log.warning("Webhook dispatch failed: %s", exc)

    return RageTriggerResponse(
        id=incident.id,
        status="created",
        group_id=group.id,
        occurrence_count=group.occurrence_count,
        replay_available=replay_path is not None,
    )
