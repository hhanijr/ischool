from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
import uuid

# اسم قاعدة البيانات
DATABASE_URL = "sqlite:///./lessons.db"

# إعداد محرك قاعدة البيانات
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Lesson(Base):
    __tablename__ = "lessons"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # 'pdf' or 'txt'
    content = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    
    # الأعمدة الخاصة بالهوية (تم التأكد من وجود user_id)
    user_id = Column(String, index=True, nullable=True) # البريد الإلكتروني للطالب
    teacher_id = Column(String, nullable=True)         # معرف المدرس (اختياري)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """تحويل الكائن إلى قاموس لإرساله كـ JSON للـ Frontend"""
        return {
            "id": self.id,
            "title": self.title,
            "filename": self.filename,
            "file_type": self.file_type,
            "explanation": self.explanation,
            "user_id": self.user_id,
            "teacher_id": self.teacher_id,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

# ============================================================
# VideoTask — tracks background video generation jobs
# ============================================================
class VideoTask(Base):
    __tablename__ = "video_tasks"

    task_id        = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    lesson_id      = Column(Integer, nullable=False, index=True)
    chapter_index  = Column(Integer, nullable=True)      # For playlist mode
    status         = Column(String, default="pending")   # pending|queued|processing|completed|failed
    video_path     = Column(String, nullable=True)        # filesystem path once complete
    video_url      = Column(String, nullable=True)        # HTTP URL served to frontend
    error          = Column(Text, nullable=True)          # clean error message on failure
    gender         = Column(String, default="male")
    retry_count    = Column(Integer, default=0)           # auto-retry attempts made (max 1)
    queue_position = Column(Integer, nullable=True)       # position in the current queue run
    created_at     = Column(DateTime, default=datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "task_id":        self.task_id,
            "lesson_id":      self.lesson_id,
            "chapter_index":  self.chapter_index,
            "status":         self.status,
            "video_path":     self.video_path,
            "video_url":      self.video_url,
            "error":          self.error,
            "gender":         self.gender,
            "retry_count":    self.retry_count,
            "queue_position": self.queue_position,
            "created_at":     self.created_at.isoformat() if self.created_at else None,
            "updated_at":     self.updated_at.isoformat() if self.updated_at else None,
        }


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="student")  # 'student' or 'teacher'
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

# دالة تهيئة قاعدة البيانات
def init_db():
    Base.metadata.create_all(bind=engine)
    print("Database tables initialised (including video_tasks)")

# دالة الحصول على الجلسة (Dependency injection)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()