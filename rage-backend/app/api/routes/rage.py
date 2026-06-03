"""POST /rage-trigger — main telemetry endpoint."""

import logging

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.schemas.rage import RageTriggerRequest, RageTriggerResponse
from app.services import incident_service, replay_service

log = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter(tags=["rage"])


@router.post("/rage-trigger", response_model=RageTriggerResponse, status_code=201)
async def rage_trigger(
    req: RageTriggerRequest,
    db: AsyncSession = Depends(get_db),
) -> RageTriggerResponse:
    """
    Receive a rage trigger from the frontend.
    Saves incident, screenshot, logs, metrics.
    Generates replay from pre-trigger buffer.
    Fires webhook alerts asynchronously.
    """
    return await incident_service.process_rage_trigger(req, db)


# ---------------------------------------------------------------------------
# WebSocket frame receiver (websocket replay mode)
# ---------------------------------------------------------------------------

@router.websocket("/ws/frames/{session_id}")
async def ws_frame_receiver(websocket: WebSocket, session_id: str) -> None:
    """
    Frontend sends base64 JPEG frames at regular intervals.
    Backend stores in circular buffer for pre-trigger replay.

    Protocol: send raw base64 JPEG (with or without data URI prefix).
    Server replies "ok" to each frame (for flow control).
    """
    if not settings.replay_enabled or settings.replay_mode != "websocket":
        await websocket.close(code=1008, reason="WebSocket replay mode not enabled")
        return

    await websocket.accept()
    log.info("WS frame receiver started for session %s", session_id)

    try:
        while True:
            data = await websocket.receive_text()
            replay_service.push_ws_frame(
                session_id=session_id,
                b64_jpeg=data,
                fps=settings.replay_fps,
                buffer_seconds=settings.replay_buffer_seconds,
            )
            await websocket.send_text("ok")
    except WebSocketDisconnect:
        log.info("WS frame receiver disconnected: session %s", session_id)
    except Exception as exc:
        log.warning("WS frame receiver error session %s: %s", session_id, exc)
