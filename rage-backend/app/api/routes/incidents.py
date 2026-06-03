"""GET /incidents — dashboard API."""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.incident import Incident, IncidentGroup
from app.schemas.rage import (
    IncidentListOut,
    IncidentOut,
    IncidentUpdateRequest,
)

log = logging.getLogger(__name__)
router = APIRouter(prefix="/incidents", tags=["incidents"])


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------

@router.get("", response_model=IncidentListOut)
async def list_incidents(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    user_id: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> IncidentListOut:
    q = select(Incident).order_by(Incident.created_at.desc())

    if category:
        q = q.where(Incident.category == category)
    if status:
        q = q.where(Incident.status == status)
    if severity:
        q = q.where(Incident.severity == severity)
    if user_id:
        q = q.where(Incident.user_id == user_id)
    if search:
        like = f"%{search}%"
        q = q.where(
            Incident.comment.ilike(like)
            | Incident.page.ilike(like)
            | Incident.user_id.ilike(like)
        )

    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar_one()

    q = q.offset((page - 1) * limit).limit(limit)
    result = await db.execute(q)
    incidents = result.scalars().all()

    return IncidentListOut(
        incidents=[IncidentOut.model_validate(i) for i in incidents],
        total=total,
        page=page,
        limit=limit,
        pages=max(1, -(-total // limit)),  # ceiling division
    )


# ---------------------------------------------------------------------------
# Detail
# ---------------------------------------------------------------------------

@router.get("/{incident_id}", response_model=IncidentOut)
async def get_incident(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
) -> IncidentOut:
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return IncidentOut.model_validate(incident)


@router.get("/{incident_id}/logs")
async def get_incident_logs(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
) -> list:
    result = await db.execute(select(Incident.logs_json).where(Incident.id == incident_id))
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return (row if isinstance(row, list) else json.loads(row)) if row else []


@router.get("/{incident_id}/metrics")
async def get_incident_metrics(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(Incident.metrics_json).where(Incident.id == incident_id))
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return (row if isinstance(row, dict) else json.loads(row)) if row else {}


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------

@router.patch("/{incident_id}", response_model=IncidentOut)
async def update_incident(
    incident_id: str,
    body: IncidentUpdateRequest,
    db: AsyncSession = Depends(get_db),
) -> IncidentOut:
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if body.status is not None:
        incident.status = body.status
    if body.severity is not None:
        incident.severity = body.severity

    await db.commit()
    return IncidentOut.model_validate(incident)


# ---------------------------------------------------------------------------
# Groups (deduplication view)
# ---------------------------------------------------------------------------

@router.get("/groups/list")
async def list_groups(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
) -> list:
    result = await db.execute(
        select(IncidentGroup)
        .order_by(IncidentGroup.occurrence_count.desc(), IncidentGroup.last_seen.desc())
        .limit(limit)
    )
    groups = result.scalars().all()
    return [
        {
            "id": g.id,
            "fingerprint": g.fingerprint,
            "category": g.category,
            "title": g.title,
            "occurrence_count": g.occurrence_count,
            "first_seen": g.first_seen.isoformat(),
            "last_seen": g.last_seen.isoformat(),
        }
        for g in groups
    ]
