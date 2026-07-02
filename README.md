# AI Career Copilot — Intelligent Placement Assistant

An AI-powered full-stack career platform for college students. Helps improve resumes, prepare for interviews, identify skill gaps, and receive personalized AI career guidance through voice interaction.

## Features

| Feature | Description |
|---------|-------------|
| **Authentication & Profile** | JWT-based signup/login with student profiles |
| **AI Resume Analyzer** | Upload PDF/DOC resumes, get ATS scores, skill analysis, improvements |
| **AI Resume Builder** | Generate optimized resumes for SWE, Data Analyst, PM roles |
| **Job Description Matcher** | Compare resume vs job posting with match percentage |
| **AI Interview Prep** | Personalized questions with AI answer evaluation |
| **Voice Career Coach** | Speech-to-text input, AI conversation, text-to-speech responses |
| **GitHub Profile Analyzer** | Analyze repos, languages, contributions, quality |
| **Skill Gap Prediction** | Job readiness scores with weekly/monthly learning roadmaps |
| **Application Tracker** | Track job applications with AI next-step suggestions |
| **Admin Dashboard** | College placement analytics and student progress |

## Tech Stack

- **Frontend:** Next.js 14, React, Tailwind CSS, Recharts, Framer Motion
- **Backend:** Python FastAPI, SQLAlchemy, JWT Auth
- **Database:** PostgreSQL
- **AI:** Google Gemini API, LangChain, ChromaDB (RAG)
- **Voice:** Web Speech API (STT/TTS)

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL (or use Docker)

### 1. Database

```bash
# Using Docker
docker run -d --name career-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=career_copilot -p 5432:5432 postgres:16-alpine
```

### 2. Backend

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
uvicorn app.main:app --reload --port 8000
```

### 3. Seed Admin (optional)

```bash
cd backend
python seed_admin.py
# Login: admin@college.edu / admin123
```

### 4. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Docker (Full Stack)

```bash
# Set your Gemini API key
export GEMINI_API_KEY=your-key-here
docker-compose up --build
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT signing key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `CORS_ORIGINS` | Allowed frontend origins |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (default: `http://localhost:8000/api`) |

## Demo Mode

The app works without a Gemini API key using intelligent mock responses. Add your `GEMINI_API_KEY` for real AI analysis.

## API Documentation

Once the backend is running, visit [http://localhost:8000/docs](http://localhost:8000/docs) for interactive Swagger docs.

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI entry point
│   │   ├── auth.py          # JWT authentication
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── routers/         # API route handlers
│   │   └── services/        # AI, RAG, GitHub, storage
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js pages
│   │   ├── components/      # UI components
│   │   └── lib/             # API client, auth, utils
│   └── Dockerfile
└── docker-compose.yml
```

## License

MIT — Built for college placement projects.
