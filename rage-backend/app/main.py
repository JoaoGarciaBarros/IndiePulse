"""
RageTrigger — FastAPI Backend
Telemetry system for game incident reporting.
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import incidents, media, rage
from app.config import get_settings
from app.database import init_db
from app.services import replay_service

logging.basicConfig(
    level=logging.DEBUG if get_settings().is_dev else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure storage directories exist
    os.makedirs(settings.incidents_dir, exist_ok=True)

    # Init database — retry até 5x com 3s de intervalo
    for attempt in range(1, 6):
        try:
            await init_db()
            log.info("Database initialized: %s", settings.database_url)
            break
        except Exception as exc:
            log.warning("DB connection attempt %d/5 failed: %s", attempt, exc)
            if attempt == 5:
                log.error("Could not connect to database after 5 attempts — check DATABASE_URL and if Supabase project is active")
                raise
            import asyncio
            await asyncio.sleep(3)

    # Start MSS screen capture if configured
    if settings.replay_enabled and settings.replay_mode == "mss":
        replay_service.start_mss_capture(
            fps=settings.replay_fps,
            buffer_seconds=settings.replay_buffer_seconds,
        )

    log.info(
        "RageTrigger API started [env=%s, replay=%s/%s]",
        settings.app_env,
        settings.replay_enabled,
        settings.replay_mode,
    )
    yield
    log.info("RageTrigger API shutting down")


app = FastAPI(
    title="RageTrigger API",
    description="Game telemetry — incident capture, replay, alerts.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(rage.router)
app.include_router(incidents.router)
app.include_router(media.router)


@app.get("/health", tags=["system"])
async def health():
    return {
        "status": "ok",
        "env": settings.app_env,
        "replay_mode": settings.replay_mode if settings.replay_enabled else "disabled",
    }
