import os
import subprocess
import shutil
import uuid
import asyncio
import sys
from datetime import datetime

# Anchor paths to this file's location (backend/utils/video_generator.py)
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))   # backend/utils/
_BACKEND_DIR = os.path.dirname(_THIS_DIR)                 # backend/
_SADTALKER_DIR = os.path.join(_BACKEND_DIR, "SadTalker")  # backend/SadTalker/
_ASSETS_DIR = os.path.join(_BACKEND_DIR, "assets")        # backend/assets/
_UPLOADS_DIR = os.path.join(_BACKEND_DIR, "uploads")      # backend/uploads/

def _find_sadtalker_python() -> str:
    """
    Return the Python executable to use for SadTalker inference.
    In Docker, we use the current interpreter.
    On host, we look for 'sadtalker' conda env or local venv.
    """
    # 1. If running inside Docker, use the current interpreter
    if os.path.exists('/.dockerenv'):
        return sys.executable

    is_windows = os.name == 'nt'
    python_exe = "python.exe" if is_windows else "python"
    venv_bin = "Scripts" if is_windows else "bin"

    candidates = [
        # Conda 'sadtalker' env (Windows/Linux)
        os.path.join(os.path.expanduser("~"), "anaconda3", "envs", "sadtalker", python_exe),
        os.path.join(os.path.expanduser("~"), "miniconda3", "envs", "sadtalker", python_exe),
        # MacOS/Linux common conda paths
        os.path.join(os.path.expanduser("~"), "anaconda3", "envs", "sadtalker", "bin", "python"),
        os.path.join(os.path.expanduser("~"), "miniconda3", "envs", "sadtalker", "bin", "python"),
    ]

    if is_windows:
        candidates.extend([
            r"C:\ProgramData\anaconda3\envs\sadtalker\python.exe",
            r"C:\ProgramData\miniconda3\envs\sadtalker\python.exe",
        ])

    # 2. Legacy venv inside SadTalker directory
    candidates.extend([
        os.path.join(_SADTALKER_DIR, "venv_sadtalker", venv_bin, python_exe),
        os.path.join(_SADTALKER_DIR, "venv", venv_bin, python_exe),
    ])

    for path in candidates:
        if os.path.exists(path):
            return path

    # 3. Final fallback: use current interpreter if it's not the system python
    # or if we are desperate. If this fails, the subprocess.run will show the error.
    return sys.executable

def create_dynamic_video(audio_path: str, text_summary: str, output_file: str, gender: str = "male") -> bool:
    """
    Drive SadTalker to produce a talking-head video.
    Supports hybrid GPU/CPU execution inside Docker.
    """
    import torch
    # Use current interpreter if in Docker, otherwise find/use 'python3' or 'python'
    if os.path.exists('/.dockerenv'):
        sadtalker_python = sys.executable
    else:
        sadtalker_python = "python3" if not os.name == 'nt' else _find_sadtalker_python()
    
    inference_script = os.path.join(_SADTALKER_DIR, "inference.py")

    abs_audio_path  = os.path.abspath(audio_path)
    abs_output_file = os.path.abspath(output_file)

    avatar_file  = "male_avatar.png" if gender == "male" else "female_avatar.png"
    source_image = os.path.join(_ASSETS_DIR, avatar_file)
    temp_results = os.path.join(_UPLOADS_DIR, "temp_sadtalker")

    print(f"[video_generator] Using Python: {sadtalker_python}")

    # ── Ensure models are accessible via symlinks (for consolidated models) ──
    try:
        models_root = os.getenv("MODELS_PATH", "/app/models")
        # 1. Check checkpoints
        target_ckpt = os.path.join(_SADTALKER_DIR, "checkpoints")
        source_ckpt = os.path.join(models_root, "sadtalker", "checkpoints")
        if os.path.exists(source_ckpt) and not os.path.exists(target_ckpt):
            print(f"[video_generator] Creating symlink: {target_ckpt} -> {source_ckpt}")
            os.symlink(source_ckpt, target_ckpt)
        
        # 2. Check gfpgan/weights (critical for KeypointExtractor)
        target_gfpgan = os.path.join(_SADTALKER_DIR, "gfpgan", "weights")
        source_gfpgan = os.path.join(models_root, "sadtalker", "gfpgan", "weights")
        if os.path.exists(source_gfpgan):
            os.makedirs(os.path.dirname(target_gfpgan), exist_ok=True)
            if not os.path.exists(target_gfpgan):
                print(f"[video_generator] Creating symlink: {target_gfpgan} -> {source_gfpgan}")
                os.symlink(source_gfpgan, target_gfpgan)
    except Exception as e:
        print(f"[video_generator] Model symlink warning: {e}")

    # ── Preflight checks ──────────────────────────────────────────────────────
    if not os.path.exists(inference_script):
        raise RuntimeError(f"SadTalker inference.py not found at: {inference_script}")

    if not os.path.exists(source_image):
        raise RuntimeError(f"Avatar image not found at: {source_image}")

    if not os.path.exists(abs_audio_path):
        raise RuntimeError(f"Audio file not found at: {abs_audio_path}")

    # ── Prepare temp output directory ─────────────────────────────────────────
    if os.path.exists(temp_results):
        shutil.rmtree(temp_results)
    os.makedirs(temp_results, exist_ok=True)

    # ── Path & Hardware Detection ─────────────────────────────────────────────
    # Standard Docker path for models as per Master Prompt
    models_root = os.getenv("MODELS_PATH", "/app/models")
    checkpoint_dir = os.path.join(models_root, "sadtalker", "checkpoints")
    
    # Check for GPU availability
    gpu_available = torch.cuda.is_available()
    
    if gpu_available:
        try:
            device_name = torch.cuda.get_device_name(0)
            print(f"[video_generator] Detected GPU: {device_name}")
        except Exception:
            pass

    print(f"[video_generator] Hardware: {'GPU' if gpu_available else 'CPU'}")

    # Build SadTalker command
    command = [
        sadtalker_python, inference_script,
        "--driven_audio", abs_audio_path,
        "--source_image", source_image,
        "--result_dir",   temp_results,
        "--checkpoint_dir", checkpoint_dir,
        "--still",
        "--preprocess", "full",
        "--enhancer",   "gfpgan",
    ]

    # If no GPU, use CPU mode
    if not gpu_available:
        command.append("--cpu")

    print(f"[video_generator] Executing SadTalker | gender={gender} | audio={abs_audio_path}")

    # Build subprocess environment
    sub_env = os.environ.copy()
    if os.name == 'nt':
        sadtalker_python_dir = os.path.dirname(sadtalker_python)
        conda_lib_bin = os.path.join(os.path.dirname(sadtalker_python_dir), "Library", "bin")
        if os.path.isdir(conda_lib_bin):
            sub_env["PATH"] = conda_lib_bin + os.pathsep + sub_env.get("PATH", "")

    # ── Run SadTalker command and log to file ────────────────────────────────
    log_dir = os.path.join(_UPLOADS_DIR, "logs")
    os.makedirs(log_dir, exist_ok=True)
    log_filename = f"sadtalker_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    log_path = os.path.join(log_dir, log_filename)

    print(f"[video_generator] Executing SadTalker. Logs: {log_path}")

    with open(log_path, "w", encoding="utf-8") as log_file:
        result = subprocess.run(
            command,
            check=False,
            cwd=_SADTALKER_DIR,
            stdout=log_file,
            stderr=log_file,
            env=sub_env,
        )

    if result.returncode != 0:
        raise RuntimeError(
            f"SadTalker exited with code {result.returncode}. "
            f"Check logs at {log_path} for details."
        )

    # ── Move generated video to final output path ─────────────────────────────
    video_found = False
    for root_dir, dirs, files in os.walk(temp_results):
        for f in files:
            if f.endswith(".mp4"):
                shutil.move(os.path.join(root_dir, f), abs_output_file)
                video_found = True
                break
        if video_found:
            break

    # Cleanup temp directory
    if os.path.exists(temp_results):
        shutil.rmtree(temp_results)

    if not video_found:
        raise RuntimeError(
            "SadTalker finished but produced no .mp4 file. "
            "Check SadTalker logs for details."
        )

    # Cleanup intermediate audio
    try:
        if os.path.exists(abs_audio_path):
            os.remove(abs_audio_path)
            print(f"🧹 Cleaned up temp audio: {abs_audio_path}")
    except OSError as e:
        print(f"⚠️  Could not delete temp audio ({e}) — continuing.")

    print(f"✅ Video saved to: {abs_output_file}")
    return True


# ──────────────────────────────────────────────────────────────────────────────
# Task orchestration helpers (moved from services/video_service.py)
# ──────────────────────────────────────────────────────────────────────────────

def create_video_task(lesson_id: int, gender: str = "male", chapter_index: int | None = None):
    """Create a VideoTask ORM object (caller must db.add / db.commit it)."""
    from database import VideoTask   # local import to avoid circular deps
    kwargs = dict(
        task_id=str(uuid.uuid4()),
        lesson_id=lesson_id,
        status="pending",
        gender=gender,
        created_at=datetime.utcnow(),
    )
    if chapter_index is not None:
        kwargs["chapter_index"] = chapter_index
    return VideoTask(**kwargs)


async def run_video_job(
    task_id: str,
    lesson_id: int,
    explanation: str,
    gender: str = "male",
    selected_indices: list | None = None,
    chapter_index: int | None = None,
    voice_id: str | None = None,
):
    """Full async video pipeline: TTS -> SadTalker. Updates VideoTask in DB.
    RAISES on failure so the queue worker triggers auto-retry.
    """
    from database import SessionLocal, VideoTask
    from utils.tts_service import generate_speech

    suffix = f"ch{chapter_index}" if chapter_index is not None else "full"
    db = SessionLocal()
    task = None
    try:
        task = db.query(VideoTask).filter(VideoTask.task_id == task_id).first()
        if not task:
            print(f"[video_job] Task {task_id} not found in DB — skipping.")
            return

        task.status = "processing"
        task.error = None
        task.updated_at = datetime.utcnow()
        db.commit()
        print(f"[video_job] START task={task_id} lesson={lesson_id} chapter={chapter_index}")

        os.makedirs(os.path.join(_UPLOADS_DIR, "videos"), exist_ok=True)
        audio_path = os.path.join(_UPLOADS_DIR, "videos", f"audio_{task_id}.mp3")
        video_filename = f"lesson_{lesson_id}_{suffix}_{gender}.mp4"
        video_path = os.path.join(_UPLOADS_DIR, "videos", video_filename)
        video_url  = f"/uploads/videos/{video_filename}"

        # ── Step 1: TTS ──────────────────────────────────────────────────────
        # Extract chapter-specific text if chapter_index is provided
        if chapter_index is not None:
            import re
            # The frontend splits by /^##\s+/gm and passes the 0-based index
            sections = [s for s in re.split(r'^##\s+', explanation, flags=re.MULTILINE) if s.strip()]
            if 0 <= chapter_index < len(sections):
                target_text = sections[chapter_index]
                print(f"[video_job] Extracted chapter {chapter_index} text ({len(target_text)} chars)")
            else:
                print(f"[video_job] Chapter {chapter_index} out of bounds (found {len(sections)} sections). Using full text.")
                target_text = explanation
        else:
            target_text = explanation
            
        # Trim text to a reasonable length for TTS
        tts_text = target_text[:4000] if len(target_text) > 4000 else target_text
        print(f"[video_job] TTS start — {len(tts_text)} chars")
        try:
            audio_bytes = await generate_speech(tts_text, gender=gender, voice_id=voice_id)
            with open(audio_path, "wb") as f:
                f.write(audio_bytes)
        except Exception as tts_err:
            raise RuntimeError(f"TTS stage failed: {tts_err}") from tts_err

        if not os.path.exists(audio_path) or os.path.getsize(audio_path) == 0:
            raise RuntimeError("TTS produced an empty audio file.")
        print(f"[video_job] TTS OK — {os.path.getsize(audio_path)} bytes")

        # ── Step 2: SadTalker ────────────────────────────────────────────────
        # Run sync SadTalker in a thread pool so we don't block the event loop
        print(f"[video_job] SadTalker start — output={video_path}")
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                create_dynamic_video,
                audio_path,
                tts_text,
                video_path,
                gender,
            )
        except Exception as st_err:
            raise RuntimeError(f"SadTalker stage failed: {st_err}") from st_err

        if not os.path.exists(video_path) or os.path.getsize(video_path) == 0:
            raise RuntimeError("SadTalker produced no video file.")

        task.status = "completed"
        task.video_path = video_path
        task.video_url  = video_url
        task.updated_at = datetime.utcnow()
        db.commit()
        print(f"[video_job] COMPLETED task={task_id} -> {video_url}")

    except Exception as exc:
        import traceback
        print(f"[video_job] FAILED task={task_id}: {exc}")
        print(traceback.format_exc())
        if task:
            task.status = "failed"
            task.error   = str(exc)[:400]
            task.updated_at = datetime.utcnow()
            db.commit()
        raise   # re-raise so queue worker triggers auto-retry
    finally:
        db.close()