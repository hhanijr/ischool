# AI Learning Assistant

An AI-powered learning platform for teachers and students with document processing, content generation, and Q&A capabilities.

## Features

### For Teachers:
- Upload lesson files (PDF or TXT)
- Automatic generation of:
  - Lesson title
  - Comprehensive explanation
  - Quiz with 5 Multiple Choice Questions (MCQs)

### For Students:
- Browse available lessons
- Select lessons from database
- Ask questions about lessons using AI-powered Q&A
- Semantic search to find relevant lessons

## Technology Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React with Next.js
- **Database**: SQLite (for lesson metadata)
- **Vector Database**: ChromaDB (for semantic search)
- **LLM**: Google Gemini Pro
- **File Processing**: PyPDF2 for PDF extraction

## Setup Instructions

### Prerequisites
- Python 3.8 or higher
- Node.js 18 or higher
- Google Gemini API key (get one at https://makersuite.google.com/app/apikey)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
   - Create a `.env` file in the `backend` directory
   - Add your Gemini API key:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   - Get your API key from: https://makersuite.google.com/app/apikey

4. Run the backend server:
```bash
# On Windows
python main.py

# On Linux/Mac
python3 main.py
```

The API will be available at `http://localhost:8000`
API documentation: `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Quick Start

1. Start the backend server first (port 8000)
2. Start the frontend server (port 3000)
3. Open `http://localhost:3000` in your browser
4. Choose Teacher or Student portal
5. For teachers: Upload a PDF or TXT file to generate content
6. For students: Select a lesson and ask questions

## API Endpoints

### Teachers
- `POST /api/teachers/upload-lesson` - Upload a lesson file
- `GET /api/teachers/lessons` - List all lessons
- `GET /api/teachers/lessons/{lesson_id}` - Get lesson details with quiz

### Students
- `GET /api/students/lessons` - List available lessons
- `GET /api/students/lessons/{lesson_id}` - Get lesson details
- `POST /api/students/ask-question` - Ask a question about a lesson
- `GET /api/students/search-lessons?query=...` - Search lessons semantically

## Project Structure

```
.
├── backend/
│   ├── main.py              # FastAPI application
│   ├── database.py          # Database models and setup
│   ├── routes/
│   │   ├── teachers.py      # Teacher endpoints
│   │   └── students.py      # Student endpoints
│   └── utils/
│       ├── file_processor.py  # File processing utilities
│       ├── llm_service.py     # LLM integration
│       └── vector_db.py       # Vector database operations
├── frontend/                # React/Next.js frontend
├── requirements.txt         # Python dependencies
└── README.md
```

## Usage

1. **Teacher workflow**:
   - Navigate to the teacher dashboard
   - Upload a PDF or TXT lesson file
   - System automatically generates title, explanation, and quiz
   - Review and manage lessons

2. **Student workflow**:
   - Browse available lessons
   - Select a lesson to study
   - Ask questions about the lesson content
   - Get AI-powered answers based on lesson content

## Notes

- Make sure to set your Gemini API key in the `.env` file
- The vector database (ChromaDB) is stored locally in `./chroma_db`
- Lesson files are stored in `./uploads`
- SQLite database (`lessons.db`) stores lesson metadata

## License

MIT

## 🐳 Docker Development Setup

The iSchool project is configured for a high-performance development workflow using Docker Compose. This setup includes GPU acceleration, hot-reloading for both services, and optimized model management.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac/Linux)
- [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) (For GPU support)

### Getting Started

1. **Prepare Models**: Ensure your AI models are placed in the `./backend/models` directory on your host machine. This directory is excluded from the Docker image to prevent bloat.
2. **Launch Services**:
   ```bash
   docker-compose up --build
   ```
3. **Access the App**:
   - **Frontend**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://localhost:8000](http://localhost:8000)
   - **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Features

- **🔥 Hot-Reload**: Code changes in `backend/` or `frontend/` are instantly reflected inside the containers via bind mounts.
- **🚀 GPU Acceleration**: The backend is configured to use NVIDIA GPUs for video generation tasks.
- **📦 Persistent Storage**: The `uploads/` folder and `lessons.db` are mapped to the host, ensuring data persists across container restarts.
- **⚡ Performance**: Large models (8GB+) stay on your local disk and are accessed via volume mounts, keeping Docker images lightweight.

