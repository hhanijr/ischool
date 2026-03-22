"""
utils/video_queue.py
--------------------
Single-GPU sequential video queue using asyncio.

Architecture:
  - One global asyncio.Queue holds pending job payloads.
  - One long-running _worker() coroutine processes jobs ONE AT A TIME (concurrency=1)
    so the GPU is never double-booked.
  - Auto-retry: if a job fails due to a transient error, it is retried ONCE
    before being marked 'failed'.
  - State is persisted to SQLite in real-time so page refreshes pick up where
    the queue left off.
"""

import asyncio
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

# ── Module-level queue (one worker reads from this) ──────────────────────────
_queue: asyncio.Queue = asyncio.Queue()
_worker_task: Optional[asyncio.Task] = None

MAX_RETRIES = 1   # auto-retry once on transient failures


# ── Public API ────────────────────────────────────────────────────────────────

async def enqueue_video_task(
    task_id: str,
    lesson_id: int,
    explanation: str,
    gender: str = "male",
    chapter_index: Optional[int] = None,
    voice_id: Optional[str] = None,
    queue_position: Optional[int] = None,
) -> None:
    """
    Add a job to the sequential queue and mark it 'queued' in the DB.
    Returns immediately — the worker processes it in the background.
    """
    from database import SessionLocal, VideoTask   # local import — avoids circular

    db = SessionLocal()
    try:
        task = db.query(VideoTask).filter(VideoTask.task_id == task_id).first()
        if task:
            task.status = "queued"
            task.queue_position = queue_position
            task.updated_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()

    payload = {
        "task_id":       task_id,
        "lesson_id":     lesson_id,
        "explanation":   explanation,
        "gender":        gender,
        "chapter_index": chapter_index,
        "voice_id":      voice_id,
    }
    await _queue.put(payload)
    logger.info(f"[queue] Enqueued task {task_id} (chapter={chapter_index}, pos={queue_position})")


def start_queue_worker(app=None) -> None:
    """
    Launch the single worker coroutine as an asyncio background task.
    Call this once from FastAPI startup (pass the app object if desired).
    """
    global _worker_task
    loop = asyncio.get_event_loop()
    _worker_task = loop.create_task(_worker())
    logger.info("[queue] Sequential video worker started.")

    # Also trigger recovery of any tasks orphaned by previous crashes/restarts
    loop.create_task(recover_orphaned_tasks())


async def recover_orphaned_tasks() -> None:
    """
    Finds tasks stuck in 'processing' or 'queued' (from before a restart)
    and puts them back into the in-memory queue.
    """
    from database import SessionLocal, VideoTask, Lesson
    db = SessionLocal()
    try:
        orphaned = (
            db.query(VideoTask)
            .filter(VideoTask.status.in_(["processing", "queued", "pending"]))
            .all()
        )
        if not orphaned:
            return

        logger.info(f"[queue] Found {len(orphaned)} orphaned task(s) to recover.")
        for task in orphaned:
            lesson = db.query(Lesson).filter(Lesson.id == task.lesson_id).first()
            if not lesson or not lesson.explanation:
                logger.warning(f"[queue] Cannot recover task {task.task_id}: Lesson/Explanation missing.")
                task.status = "failed"
                task.error = "Original lesson content missing during recovery."
                continue

            # Re-enqueue
            payload = {
                "task_id":       task.task_id,
                "lesson_id":     task.lesson_id,
                "explanation":   lesson.explanation,
                "gender":        task.gender,
                "chapter_index": task.chapter_index,
                "voice_id":      None, # we don't store voice_id yet, default will be used
            }
            # Put in queue (won't block worker as worker is starting)
            await _queue.put(payload)
            
            # Reset status to queued so UI shows it's waiting
            task.status = "queued"
            logger.info(f"[queue] Recovered task {task.task_id} (chapter {task.chapter_index})")
        
        db.commit()
    except Exception as e:
        logger.error(f"[queue] Recovery failed: {e}")
    finally:
        db.close()


# ── Internal worker  ──────────────────────────────────────────────────────────

async def _worker() -> None:
    """
    Runs forever. Picks up one job at a time, processes it, then picks the next.
    Never raises — all errors are caught so the loop never dies.
    """
    logger.info("[queue] Worker loop running — waiting for jobs...")
    while True:
        payload = await _queue.get()
        task_id = payload["task_id"]
        
        # ── Check if task still exists (might have been cancelled) ────────────
        from database import SessionLocal, VideoTask
        db = SessionLocal()
        task = db.query(VideoTask).filter(VideoTask.task_id == task_id).first()
        db.close()

        if not task:
            logger.info(f"[queue] Task {task_id} no longer in DB (cancelled) — skipping.")
            _queue.task_done()
            continue

        try:
            logger.info(f"[queue] Starting task {task_id}")
            await _process_with_retry(payload)
        except Exception as exc:
            # Shouldn't reach here — _process_with_retry catches everything
            logger.error(f"[queue] Unexpected error for task {task_id}: {exc}")
            await _mark_failed(task_id, str(exc))
        finally:
            _queue.task_done()
            logger.info(f"[queue] Task {task_id} done. Queue size: {_queue.qsize()} remaining.")


async def _process_with_retry(payload: dict) -> None:
    """
    Attempt the job up to (MAX_RETRIES + 1) times.
    On first failure, waits 5 s then retries once.
    On second failure, marks as 'failed' with a clean message.
    """
    from database import SessionLocal, VideoTask
    from utils.video_generator import run_video_job

    task_id = payload["task_id"]

    for attempt in range(MAX_RETRIES + 1):
        try:
            if attempt > 0:
                logger.warning(f"[queue] Retrying task {task_id} (attempt {attempt + 1})...")
                await _update_retry_count(task_id, attempt)
                await asyncio.sleep(5)   # brief pause before retry

            await run_video_job(
                task_id=payload["task_id"],
                lesson_id=payload["lesson_id"],
                explanation=payload["explanation"],
                gender=payload["gender"],
                chapter_index=payload.get("chapter_index"),
                voice_id=payload.get("voice_id"),
            )
            # If we reach here without exception, success
            return

        except Exception as exc:
            clean_msg = _clean_error(exc)
            logger.error(f"[queue] Task {task_id} attempt {attempt + 1} failed: {exc}")

            if attempt >= MAX_RETRIES:
                # All retries exhausted
                await _mark_failed(task_id, clean_msg)
                return
            # else: loop and retry


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _update_retry_count(task_id: str, count: int) -> None:
    from database import SessionLocal, VideoTask
    db = SessionLocal()
    try:
        task = db.query(VideoTask).filter(VideoTask.task_id == task_id).first()
        if task:
            task.retry_count = count
            task.updated_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()


async def _mark_failed(task_id: str, error_msg: str) -> None:
    from database import SessionLocal, VideoTask
    db = SessionLocal()
    try:
        task = db.query(VideoTask).filter(VideoTask.task_id == task_id).first()
        if task:
            task.status = "failed"
            task.error = error_msg
            task.updated_at = datetime.utcnow()
            db.commit()
            logger.error(f"[queue] Task {task_id} marked FAILED: {error_msg}")
    finally:
        db.close()


def _clean_error(exc: Exception) -> str:
    """Return a user-friendly error string (strips long Python tracebacks)."""
    msg = str(exc)
    # SadTalker produces very long stderr — keep only first 200 chars
    if "SadTalker" in msg or "stderr" in msg:
        return "Video rendering failed (SadTalker error). Check server logs for details."
    if "TTS" in msg or "speech" in msg.lower():
        return "Audio generation failed. Please try again."
    if "CUDA" in msg or "out of memory" in msg.lower():
        return "GPU out of memory. Try a shorter chapter or retry later."
    return msg[:200] if len(msg) > 200 else msg
