"""File serving — screenshots and replay videos."""

import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.incident import Incident

router = APIRouter(prefix="/incidents", tags=["media"])


@router.get("/{incident_id}/screenshot")
async def get_screenshot(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
) -> FileResponse:
    result = await db.execute(
        select(Incident.screenshot_path).where(Incident.id == incident_id)
    )
    path = result.scalar_one_or_none()

    if not path:
        raise HTTPException(status_code=404, detail="No screenshot for this incident")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Screenshot file missing from disk")

    return FileResponse(path, media_type="image/png", filename=f"screenshot_{incident_id}.png")


@router.get("/{incident_id}/video")
async def get_replay(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
) -> FileResponse:
    result = await db.execute(
        select(Incident.replay_path).where(Incident.id == incident_id)
    )
    path = result.scalar_one_or_none()

    if not path:
        raise HTTPException(status_code=404, detail="No replay for this incident")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Replay file missing from disk")

    return FileResponse(
        path,
        media_type="video/mp4",
        filename=f"replay_{incident_id}.mp4",
        headers={"Accept-Ranges": "bytes"},
    )
