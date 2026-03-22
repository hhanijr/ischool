"""
routes/students.py — Thin HTTP controller
All AI logic lives in utils/.  This file only handles:
  • HTTP request parsing / validation
  • Delegating to the utils layer
  • Returning appropriate HTTP responses
"""

from fastapi import APIRouter, HTTPException, Depends, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import io

from database import get_db, Lesson, VideoTask
from utils.llm_service import answer_question, generate_eli5, generate_mindmap
from utils.tts_service import generate_speech
from utils.video_generator import create_video_task
from utils.video_queue import enqueue_video_task
from utils.vector_db import search_similar_content
from utils.auth import verify_firebase_token

router = APIRouter()


# ── Pydantic request models ─────────────────────────────────────────────────

class QuestionRequest(BaseModel):
    lesson_id: int
    question: str

class GenerateVideoRequest(BaseModel):
    chapters: Optional[List[int]] = None
    mode: Optional[str] = "single"
    gender: Optional[str] = "male"
    voice_id: Optional[str] = None

class VoicePreviewRequest(BaseModel):
    text: str
    voice_id: str

class Eli5Request(BaseModel):
    content: str


# ============================================================
# 1. List lessons for the authenticated user
# ============================================================
@router.get("/lessons")
async def list_lessons(
    db: Session = Depends(get_db),
    user_payload: dict = Depends(verify_firebase_token),
):
    user_email = user_payload.get("email")
    if not user_email:
        raise HTTPException(status_code=400, detail="User email not found in token")

    try:
        lessons = db.query(Lesson).filter(Lesson.user_id == user_email).all()
        return {"lessons": [lesson.to_dict() for lesson in lessons]}
    except Exception as e:
        print(f"❌ Error fetching lessons: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


# ============================================================
# 2. Start video generation (sequential queue)
# ============================================================
@router.post("/lessons/{lesson_id}/generate-video")
async def generate_lesson_video(
    lesson_id: int,
    request: GenerateVideoRequest = Body(default=None),
    db: Session = Depends(get_db),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson or not lesson.explanation:
        raise HTTPException(status_code=404, detail="Lesson explanation not found")

    gender           = (request.gender   if request and request.gender   else "male")
    selected_indices = (request.chapters if request and request.chapters else [])
    voice_id         = (request.voice_id if request and request.voice_id else None)

    if not selected_indices:
        raise HTTPException(status_code=400, detail="No chapters selected")

    spawned_tasks = []
    total = len(selected_indices)

    for pos, chapter_idx in enumerate(selected_indices, start=1):
        task = create_video_task(
            lesson_id=lesson_id,
            gender=gender,
            chapter_index=chapter_idx,
        )
        db.add(task)
        db.commit()
        db.refresh(task)

        # Enqueue — worker processes one at a time (concurrency = 1)
        await enqueue_video_task(
            task_id=task.task_id,
            lesson_id=lesson_id,
            explanation=lesson.explanation,
            gender=gender,
            chapter_index=chapter_idx,
            voice_id=voice_id,
            queue_position=pos,
        )

        spawned_tasks.append({
            "chapter_index":  chapter_idx,
            "task_id":        task.task_id,
            "queue_position": pos,
            "total":          total,
        })

    return {
        "tasks":   spawned_tasks,
        "message": f"{total} chapter(s) queued for sequential processing.",
    }


# ============================================================
# 3. Poll status of a specific video task
# ============================================================
@router.get("/lessons/{lesson_id}/video-status/{task_id}")
async def get_video_status(
    lesson_id: int,
    task_id: str,
    db: Session = Depends(get_db),
):
    task = (
        db.query(VideoTask)
        .filter(VideoTask.task_id == task_id, VideoTask.lesson_id == lesson_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task.to_dict()


# ============================================================
# 3b. Fetch ALL video tasks for a lesson (state restore on reload)
# ============================================================
@router.get("/lessons/{lesson_id}/video-tasks")
async def get_lesson_video_tasks(
    lesson_id: int,
    db: Session = Depends(get_db),
):
    tasks = (
        db.query(VideoTask)
        .filter(VideoTask.lesson_id == lesson_id)
        .order_by(VideoTask.created_at)
        .all()
    )
    return {"tasks": [t.to_dict() for t in tasks]}


# ============================================================
# 3c. Delete/Cancel a video task
# ============================================================
@router.delete("/lessons/{lesson_id}/video-tasks/{task_id}")
async def delete_video_task(
    lesson_id: int,
    task_id: str,
    db: Session = Depends(get_db),
):
    task = (
        db.query(VideoTask)
        .filter(VideoTask.task_id == task_id, VideoTask.lesson_id == lesson_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # If completed, delete the actual file
    if task.video_path and os.path.exists(task.video_path):
        try:
            os.remove(task.video_path)
            print(f"[delete] Removed file: {task.video_path}")
        except Exception as e:
            print(f"[delete] Error removing file {task.video_path}: {e}")

    db.delete(task)
    db.commit()
    print(f"[delete] Task {task_id} deleted from DB")

    return {"message": "Task deleted successfully"}


# ============================================================
# 4. Stream audio for a lesson
# ============================================================
@router.get("/lessons/{lesson_id}/audio")
async def get_lesson_audio(
    lesson_id: int,
    gender: str = "male",
    db: Session = Depends(get_db),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    audio_data = await generate_speech(lesson.explanation, gender=gender)
    return StreamingResponse(io.BytesIO(audio_data), media_type="audio/mpeg")


# ============================================================
# 5. Fetch a single lesson
# ============================================================
@router.get("/lessons/{lesson_id}")
async def get_lesson(lesson_id: int, db: Session = Depends(get_db)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return {"lesson": lesson.to_dict()}


# ============================================================
# 6. Ask a question about a lesson (RAG)
# ============================================================
@router.post("/ask-question")
async def ask_question(request: QuestionRequest, db: Session = Depends(get_db)):
    lesson = db.query(Lesson).filter(Lesson.id == request.lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    similar_content = search_similar_content(
        request.question, lesson_id=request.lesson_id, top_k=3
    )
    context = (
        "\n\n".join([chunk["content"] for chunk in similar_content])
        or lesson.content[:15000]
    )
    answer = await answer_question(request.question, context)
    return {"answer": answer}


# ============================================================
# 7. Preview Voice (TTS chunk)
# ============================================================
@router.post("/preview-voice")
async def preview_voice(request: VoicePreviewRequest, db: Session = Depends(get_db)):
    try:
        audio_data = await generate_speech(
            text=request.text,
            gender="male",
            voice_id=request.voice_id
        )
        return StreamingResponse(io.BytesIO(audio_data), media_type="audio/mpeg")
    except Exception as e:
        print(f"❌ Preview Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to preview voice")


# ============================================================
# 8. Explain Like I'm 5 (ELI5)
# ============================================================
@router.post("/lessons/{lesson_id}/eli5")
async def get_eli5_explanation(
    lesson_id: int, request: Eli5Request, db: Session = Depends(get_db)
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    simplified = await generate_eli5(request.content)
    return {"explanation": simplified}


# ============================================================
# 9. Generate Lesson Mind Map
# ============================================================
@router.get("/lessons/{lesson_id}/mindmap")
async def get_lesson_mindmap(lesson_id: int, db: Session = Depends(get_db)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    # Pass the lesson content to generate the graph
    try:
        graph_data = await generate_mindmap(lesson.content)
        return {"mindmap": graph_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to generate neural map")