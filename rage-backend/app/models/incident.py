from datetime import datetime
from uuid import uuid4
from sqlalchemy import Column, String, Text, Integer, DateTime, Boolean, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.database import Base


def _uuid() -> str:
    return str(uuid4())


class IncidentGroup(Base):
    __tablename__ = "incident_groups"

    id               = Column(String, primary_key=True, default=_uuid)
    fingerprint      = Column(String, unique=True, nullable=False, index=True)
    category         = Column(String, nullable=False)
    title            = Column(String, nullable=False)
    occurrence_count = Column(Integer, default=1, nullable=False)
    first_seen       = Column(DateTime, nullable=False, default=datetime.utcnow)
    last_seen        = Column(DateTime, nullable=False, default=datetime.utcnow)

    incidents = relationship("Incident", back_populates="group", lazy="select")


class Incident(Base):
    __tablename__ = "incidents"

    id         = Column(String, primary_key=True, default=_uuid)
    timestamp  = Column(DateTime, nullable=False)
    session_id = Column(String, nullable=False, index=True)
    user_id    = Column(String, nullable=True, index=True)
    page       = Column(String, nullable=True)

    category = Column(String, nullable=False, index=True)
    comment  = Column(Text, nullable=True)
    status   = Column(String, default="open", nullable=False, index=True)
    severity = Column(String, default="medium", nullable=False, index=True)

    screenshot_path = Column(String, nullable=True)
    replay_path     = Column(String, nullable=True)

    logs_json     = Column(Text, nullable=True)
    metrics_json  = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)

    fps        = Column(Float, nullable=True)
    ping_ms    = Column(Float, nullable=True)
    js_heap_mb = Column(Float, nullable=True)

    fingerprint = Column(String, nullable=True, index=True)
    group_id    = Column(String, ForeignKey("incident_groups.id"), nullable=True, index=True)
    group       = relationship("IncidentGroup", back_populates="incidents")

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class WebhookLog(Base):
    __tablename__ = "webhook_logs"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    incident_id = Column(String, nullable=False, index=True)
    category    = Column(String, nullable=False)
    target      = Column(String, nullable=False)
    success     = Column(Boolean, default=True)
    error_msg   = Column(Text, nullable=True)
    sent_at     = Column(DateTime, default=datetime.utcnow, nullable=False)
