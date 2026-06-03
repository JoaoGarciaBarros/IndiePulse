"""
Circular Frame Buffer — Pre-trigger Replay Engine
==================================================

Two modes (REPLAY_MODE env var):

  websocket  (default, browser games)
    Frontend streams frames via WebSocket /ws/frames/{session_id}.
    Backend holds last N frames per session in a deque.
    On rage trigger, encodes frames → MP4 with PyAV.

  mss  (desktop/local games on same machine)
    Background thread captures screen with MSS at REPLAY_FPS.
    One global buffer. Same encoder.

Tradeoffs
---------
  websocket  Pro: works for any browser game. No server GPU needed.
             Con: network overhead (~50-200 KB/s at 10fps JPEG).

  mss        Pro: zero frontend changes. High fidelity.
             Con: only works when game runs on same host as API.
             Uses ~5-15% CPU depending on resolution/fps.

  PyAV       Pro: fast H.264 encoding, no FFmpeg subprocess.
             Con: requires libav libraries.

  FFmpeg subprocess (fallback)
             Pro: always available if ffmpeg in PATH.
             Con: disk I/O for temp frames.
"""

import asyncio
import base64
import io
import logging
import os
import shutil
import tempfile
import threading
import time
from collections import deque
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Frame buffer
# ---------------------------------------------------------------------------

class _FrameBuffer:
    """Thread-safe circular buffer of (timestamp, np.ndarray BGR) tuples."""

    def __init__(self, max_frames: int) -> None:
        self._buf: deque[tuple[float, np.ndarray]] = deque(maxlen=max_frames)
        self._lock = threading.Lock()

    def push(self, frame: np.ndarray) -> None:
        with self._lock:
            self._buf.append((time.monotonic(), frame))

    def freeze(self, seconds: int) -> list[np.ndarray]:
        """Return frames from the last `seconds` seconds."""
        with self._lock:
            if not self._buf:
                return []
            cutoff = time.monotonic() - seconds
            return [f for ts, f in self._buf if ts >= cutoff]

    def __len__(self) -> int:
        with self._lock:
            return len(self._buf)


# One buffer per session (websocket mode) or a single global buffer (mss mode)
_session_buffers: dict[str, _FrameBuffer] = {}
_global_buffer: Optional[_FrameBuffer] = None
_mss_thread: Optional[threading.Thread] = None


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

def start_mss_capture(fps: int, buffer_seconds: int) -> None:
    """Start background screen capture thread (mss mode only)."""
    global _global_buffer, _mss_thread

    try:
        import mss  # noqa: F401
    except ImportError:
        log.warning("mss not installed — MSS capture disabled")
        return

    _global_buffer = _FrameBuffer(max_frames=buffer_seconds * fps)

    def _loop() -> None:
        import mss as mss_lib
        interval = 1.0 / fps
        with mss_lib.mss() as sct:
            monitor = sct.monitors[1]
            while True:
                try:
                    raw = sct.grab(monitor)
                    frame = np.array(raw)[:, :, :3]  # BGRA → BGR
                    _global_buffer.push(frame)  # type: ignore[union-attr]
                except Exception as exc:
                    log.debug("MSS frame error: %s", exc)
                time.sleep(interval)

    _mss_thread = threading.Thread(target=_loop, daemon=True, name="mss-capture")
    _mss_thread.start()
    log.info("MSS capture started at %d fps", fps)


def get_or_create_session_buffer(session_id: str, fps: int, buffer_seconds: int) -> _FrameBuffer:
    if session_id not in _session_buffers:
        _session_buffers[session_id] = _FrameBuffer(max_frames=buffer_seconds * fps)
    return _session_buffers[session_id]


def push_ws_frame(session_id: str, b64_jpeg: str, fps: int, buffer_seconds: int) -> None:
    """Decode a base64 JPEG frame and push into the session buffer."""
    buf = get_or_create_session_buffer(session_id, fps, buffer_seconds)
    try:
        if "," in b64_jpeg:
            b64_jpeg = b64_jpeg.split(",", 1)[1]
        raw = base64.b64decode(b64_jpeg + "==")
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        frame = np.array(img)[:, :, ::-1].copy()  # RGB → BGR
        buf.push(frame)
    except Exception as exc:
        log.debug("Frame decode error for session %s: %s", session_id, exc)


# ---------------------------------------------------------------------------
# Encoder
# ---------------------------------------------------------------------------

def _encode_pyav(frames: list[np.ndarray], output_path: str, fps: int) -> bool:
    try:
        import av

        if not frames:
            return False

        h, w = frames[0].shape[:2]
        # Ensure even dimensions (H.264 requirement)
        w = w if w % 2 == 0 else w - 1
        h = h if h % 2 == 0 else h - 1

        with av.open(output_path, "w", format="mp4") as container:
            stream = container.add_stream("h264", rate=fps)
            stream.width = w
            stream.height = h
            stream.pix_fmt = "yuv420p"
            stream.options = {"crf": "28", "preset": "fast"}

            for raw in frames:
                resized = raw[:h, :w]  # crop to even dimensions
                av_frame = av.VideoFrame.from_ndarray(resized, format="bgr24")
                for pkt in stream.encode(av_frame):
                    container.mux(pkt)

            for pkt in stream.encode():
                container.mux(pkt)

        return True
    except ImportError:
        log.warning("PyAV not installed — falling back to FFmpeg subprocess")
        return False
    except Exception as exc:
        log.error("PyAV encode error: %s", exc)
        return False


def _encode_ffmpeg_subprocess(frames: list[np.ndarray], output_path: str, fps: int) -> bool:
    """Fallback: write frames as PNGs, stitch with ffmpeg subprocess."""
    if not shutil.which("ffmpeg"):
        log.error("ffmpeg not in PATH — replay generation unavailable")
        return False

    import subprocess

    tmpdir = tempfile.mkdtemp(prefix="rage_replay_")
    try:
        for i, frame in enumerate(frames):
            img = Image.fromarray(frame[:, :, ::-1])  # BGR → RGB
            img.save(f"{tmpdir}/f{i:05d}.png")

        cmd = [
            "ffmpeg", "-y",
            "-framerate", str(fps),
            "-i", f"{tmpdir}/f%05d.png",
            "-c:v", "libx264",
            "-crf", "28",
            "-preset", "fast",
            "-pix_fmt", "yuv420p",
            output_path,
        ]
        result = subprocess.run(cmd, capture_output=True, timeout=60)
        return result.returncode == 0
    except Exception as exc:
        log.error("FFmpeg subprocess error: %s", exc)
        return False
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def generate_replay(
    incident_dir: str,
    session_id: str,
    mode: str,
    buffer_seconds: int,
    fps: int,
) -> Optional[str]:
    """
    Freeze buffer, encode replay.mp4, return path or None.
    Runs blocking work in thread pool to avoid blocking event loop.
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        _generate_replay_sync,
        incident_dir,
        session_id,
        mode,
        buffer_seconds,
        fps,
    )


def _generate_replay_sync(
    incident_dir: str,
    session_id: str,
    mode: str,
    buffer_seconds: int,
    fps: int,
) -> Optional[str]:
    if mode == "mss":
        buf = _global_buffer
    else:
        buf = _session_buffers.get(session_id)

    if buf is None:
        log.info("No replay buffer for session %s", session_id)
        return None

    frames = buf.freeze(buffer_seconds)
    if len(frames) < 2:
        log.info("Too few frames (%d) to generate replay", len(frames))
        return None

    output_path = str(Path(incident_dir) / "replay.mp4")
    log.info("Encoding %d frames → %s", len(frames), output_path)

    success = _encode_pyav(frames, output_path, fps) or _encode_ffmpeg_subprocess(
        frames, output_path, fps
    )

    if success and os.path.exists(output_path):
        return output_path

    log.warning("Replay generation failed for session %s", session_id)
    return None
