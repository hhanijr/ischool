from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from typing import List, Optional
import os
os.environ["POSTHOG_DISABLED"] = "1"

from dotenv import load_dotenv
import uvicorn
import firebase_admin
from firebase_admin import credentials

# استيراد الروابط وقاعدة البيانات من ملفاتك
from routes import teachers, students, auth
from database import init_db

# تحميل ملف .env
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

# ============================================================
# 1. تهيئة Firebase Admin SDK
# ============================================================
try:
    if not firebase_admin._apps:
        cred = credentials.Certificate("firebase-key.json")
        firebase_admin.initialize_app(cred)
        print("✅ Firebase Admin SDK initialized successfully with 'ischool-af511'")
except Exception as e:
    print(f"❌ Critical Error initializing Firebase Admin: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start background workers on server boot."""
    from utils.video_queue import start_queue_worker
    start_queue_worker()
    print("Sequential video queue worker started.")
    yield
    # (cleanup on shutdown if needed)


app = FastAPI(title="AI Learning Assistant", version="1.0.0", lifespan=lifespan)

# ============================================================
# 2. إعدادات CORS
# ============================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001", 
        "http://localhost:3002", 
        "http://localhost:3003", 
        "http://localhost:3004", 
        "http://localhost:3005"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# تهيئة قاعدة البيانات (SQLite)
init_db()

# ============================================================
# 3. مشاركة المجلدات الثابتة (Static Files) - حل مشكلة اختفاء الفيديو
# ============================================================
# التأكد من وجود مجلد uploads ومجلد الفيديوهات بداخله
if not os.path.exists("uploads"):
    os.makedirs("uploads")
if not os.path.exists("uploads/videos"):
    os.makedirs("uploads/videos")

# هذا السطر يسمح للمتصفح بالوصول للملفات عبر رابط URL
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ============================================================
# 4. تسجيل المسارات (Routes)
# ============================================================
app.include_router(teachers.router, prefix="/api/teachers", tags=["teachers"])
app.include_router(students.router, prefix="/api/students", tags=["students"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])

@app.get("/")
async def root():
    return {"message": "AI Learning Assistant API is running"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "firebase_initialized": len(firebase_admin._apps) > 0}

# ============================================================
# 5. تشغيل السيرفر
# ============================================================
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)