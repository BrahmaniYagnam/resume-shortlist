from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import engine, Base
from app.routers import auth, profile, resume, interview, voice, github, skills, applications, admin

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.chroma_persist_dir).mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title=settings.app_name,
    description="AI-powered career platform for college students",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(resume.router, prefix="/api")
app.include_router(interview.router, prefix="/api")
app.include_router(voice.router, prefix="/api")
app.include_router(github.router, prefix="/api")
app.include_router(skills.router, prefix="/api")
app.include_router(applications.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


@app.get("/")
def read_root():
    return {
        "message": f"Welcome to the {settings.app_name} API backend!",
        "docs_url": "/docs",
        "health_check": "/api/health",
        "frontend_url": "http://localhost:3000"
    }


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "gpu_compute": settings.gpu_compute_enabled,
    }

