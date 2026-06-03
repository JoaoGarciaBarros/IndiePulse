from datetime import datetime
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field

RageCategory = Literal["bug", "lag", "frustration", "exploit", "ui_ux", "performance", "other"]
IncidentStatus = Literal["open", "investigating", "resolved"]
IncidentSeverity = Literal["low", "medium", "high", "critical"]


class LogEntry(BaseModel):
    level: Literal["log", "warn", "error"]
    message: str
    timestamp: int  # epoch ms
    stack: Optional[str] = None


class Metrics(BaseModel):
    fps: Optional[float] = None
    memory: Optional[float] = None
    resolution: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    ping: Optional[float] = None
    networkType: Optional[str] = None
    networkDownlink: Optional[float] = None
    jsHeapSize: Optional[float] = None
    jsHeapLimit: Optional[float] = None


class RageTriggerRequest(BaseModel):
    timestamp: str
    sessionId: str
    userId: Optional[str] = None
    category: RageCategory
    comment: str = ""
    logs: list[LogEntry] = Field(default_factory=list)
    metrics: Metrics = Field(default_factory=Metrics)
    screenshot: Optional[str] = None  # data URI or raw base64
    page: str = "/"
    metadata: dict[str, Any] = Field(default_factory=dict)


class RageTriggerResponse(BaseModel):
    id: str
    status: str = "created"
    group_id: Optional[str] = None
    occurrence_count: int = 1
    replay_available: bool = False


class IncidentGroupOut(BaseModel):
    id: str
    fingerprint: str
    category: str
    title: str
    occurrence_count: int
    first_seen: datetime
    last_seen: datetime


class IncidentOut(BaseModel):
    id: str
    timestamp: datetime
    session_id: str
    user_id: Optional[str]
    page: Optional[str]
    category: str
    comment: Optional[str]
    status: str
    severity: str
    fps: Optional[float]
    ping_ms: Optional[float]
    js_heap_mb: Optional[float]
    screenshot_path: Optional[str]
    replay_path: Optional[str]
    fingerprint: Optional[str]
    group_id: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class IncidentListOut(BaseModel):
    incidents: list[IncidentOut]
    total: int
    page: int
    limit: int
    pages: int


class IncidentUpdateRequest(BaseModel):
    status: Optional[IncidentStatus] = None
    severity: Optional[IncidentSeverity] = None
