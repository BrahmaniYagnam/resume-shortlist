from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User, Resume, StudentProfile
from app.schemas.resume import ResumeAnalysisResponse, ResumeBuildRequest, JobMatchRequest
from app.services.ai_service import analyze_resume, build_resume, match_job_description, extract_resume_text
from app.services.storage_service import save_upload
from app.services.rag_service import rag_service

router = APIRouter(prefix="/resume", tags=["Resume"])


@router.post("/upload", response_model=ResumeAnalysisResponse)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(400, "No file provided")

    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("pdf", "doc", "docx"):
        raise HTTPException(400, "Only PDF and DOC/DOCX files are supported")

    file_path, filename, file_type = await save_upload(file, current_user.id)
    resume_text = extract_resume_text(file_path, file_type)

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    target_role = profile.target_role if profile else ""

    analysis_result = await analyze_resume(resume_text, target_role)

    resume = Resume(
        user_id=current_user.id,
        filename=filename,
        file_path=file_path,
        file_type=file_type,
        extracted_data={
            "education": analysis_result.get("education", []),
            "skills": analysis_result.get("skills", []),
            "projects": analysis_result.get("projects", []),
            "experience": analysis_result.get("experience", []),
            "certifications": analysis_result.get("certifications", []),
            "achievements": analysis_result.get("achievements", []),
        },
        analysis={
            "skill_analysis": analysis_result.get("skill_analysis", {}),
            "strengths": analysis_result.get("strengths", []),
            "weaknesses": analysis_result.get("weaknesses", []),
            "missing_keywords": analysis_result.get("missing_keywords", []),
            "improvements": analysis_result.get("improvements", []),
        },
        ats_score=float(analysis_result.get("ats_score", 0)),
        quality_score=float(analysis_result.get("quality_score", 0)),
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    rag_service.index_user_context(
        current_user.id,
        [resume_text],
        [{"type": "resume", "resume_id": resume.id}],
    )

    return resume


@router.get("/list", response_model=list[ResumeAnalysisResponse])
def list_resumes(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.created_at.desc()).all()


@router.get("/{resume_id}", response_model=ResumeAnalysisResponse)
def get_resume(resume_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(404, "Resume not found")
    return resume


@router.post("/build")
async def build_optimized_resume(
    data: ResumeBuildRequest,
    current_user: User = Depends(get_current_user),
):
    result = await build_resume(data.model_dump(), data.template)
    return result


@router.post("/match")
async def match_job(
    data: JobMatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume_text = ""
    if data.resume_id:
        resume = db.query(Resume).filter(Resume.id == data.resume_id, Resume.user_id == current_user.id).first()
        if resume:
            resume_text = extract_resume_text(resume.file_path, resume.file_type)
    else:
        latest = db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.created_at.desc()).first()
        if latest:
            resume_text = extract_resume_text(latest.file_path, latest.file_type)

    if not resume_text:
        raise HTTPException(400, "No resume found. Upload a resume first.")

    result = await match_job_description(resume_text, data.job_description)
    return result
