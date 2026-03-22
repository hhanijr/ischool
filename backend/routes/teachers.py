"""
routes/teachers.py — Thin HTTP controller
All AI logic lives in utils/.  This file only handles:
  • HTTP request parsing / validation
  • Delegating to the utils layer
  • Returning appropriate HTTP responses
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status, Form, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os

from database import get_db, Lesson, VideoTask
from utils.llm_service import generate_explanation, generate_quiz
from utils.video_generator import run_video_job, create_video_task
from utils.file_processor import process_uploaded_file
from utils.auth import verify_firebase_token
from utils.vector_db import delete_lesson_from_vector_db, add_lesson_to_vector_db

router = APIRouter()


class GenerateQuizRequest(BaseModel):
    num_questions: int = 5


# ============================================================
# 1. Upload a new lesson (auth required)
# ============================================================
@router.post("/upload-lesson")
async def upload_lesson(
    title: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_payload: dict = Depends(verify_firebase_token),
):
    user_email = user_payload.get("email")
    if not user_email:
        raise HTTPException(status_code=400, detail="User email not found in token")

    try:
        file_contents = await file.read()
        content       = await process_uploaded_file(file_contents, file.content_type)

        if not content or len(content.strip()) < 50:
            raise HTTPException(status_code=400, detail="File content is too short")

        explanation = await generate_explanation(content)

        lesson = Lesson(
            title=title,
            filename=file.filename,
            file_type="pdf" if file.content_type == "application/pdf" else "txt",
            content=content,
            explanation=explanation,
            user_id=user_email,
        )
        db.add(lesson)
        db.commit()
        db.refresh(lesson)

        add_lesson_to_vector_db(lesson.id, title, content)

        return {"message": "Success", "lesson": lesson.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Upload Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 2. List the teacher's own lessons (auth required)
# ============================================================
@router.get("/lessons")
async def list_lessons(
    db: Session = Depends(get_db),
    user_payload: dict = Depends(verify_firebase_token),
):
    user_email = user_payload.get("email")
    lessons = db.query(Lesson).filter(Lesson.user_id == user_email).all()
    return {"lessons": [lesson.to_dict() for lesson in lessons]}


# ============================================================
# 3. Generate a quiz for a lesson
# ============================================================
@router.post("/lessons/{lesson_id}/generate-quiz")
async def generate_lesson_quiz(
    lesson_id: int,
    request: GenerateQuizRequest,
    db: Session = Depends(get_db),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    try:
        quiz = await generate_quiz(lesson.content, num_questions=request.num_questions)
        return {"quiz": quiz}
    except Exception as e:
        print(f"Quiz Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate quiz")


# ============================================================
# 4. Delete a lesson (auth required)
# ============================================================
@router.delete("/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    user_payload: dict = Depends(verify_firebase_token),
):
    user_email = user_payload.get("email")
    lesson = db.query(Lesson).filter(
        Lesson.id == lesson_id, Lesson.user_id == user_email
    ).first()

    if not lesson:
        raise HTTPException(status_code=404, detail="Access denied or lesson not found")

    try:
        delete_lesson_from_vector_db(lesson_id)
        db.delete(lesson)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return None


# ============================================================
# 5. Generate video (teacher side) — background task
# ============================================================
@router.post("/lessons/{lesson_id}/generate-video")
async def generate_lesson_video(
    lesson_id: int,
    background_tasks: BackgroundTasks,
    gender: str = Form(default="male"),
    db: Session = Depends(get_db),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson or not lesson.explanation:
        raise HTTPException(status_code=404, detail="Lesson missing data")

    task = create_video_task(lesson_id=lesson_id, gender=gender)
    db.add(task)
    db.commit()
    db.refresh(task)

    from utils.video_queue import enqueue_video_task
    await enqueue_video_task(
        task_id=task.task_id,
        lesson_id=lesson_id,
        explanation=lesson.explanation,
        gender=gender,
    )

    return {
        "task_id": task.task_id,
        "status":  "pending",
        "message": "Video generation started. Poll /video-status/{task_id} for progress.",
    }


# ============================================================
# 6. Poll teacher video-task status
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
# 7. Serve the generated video file
# ============================================================
@router.get("/lessons/{lesson_id}/video")
async def get_lesson_video(lesson_id: int, gender: str = "male"):
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    video_path  = os.path.join(
        backend_dir, "uploads", "videos", f"lesson_{lesson_id}_full_{gender}.mp4"
    )
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(video_path, media_type="video/mp4")