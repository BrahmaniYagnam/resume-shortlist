from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User, SkillAssessment, StudentProfile, Resume
from app.services.ai_service import predict_skill_gaps, extract_resume_text

router = APIRouter(prefix="/skills", tags=["Skill Gap"])


@router.post("/assess")
async def assess_skills(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    profile_data = {
        "name": profile.name if profile else "",
        "college": profile.college if profile else "",
        "branch": profile.branch if profile else "",
        "year": profile.year if profile else "",
        "skills": profile.skills if profile else [],
        "target_role": profile.target_role if profile else "Software Engineer",
        "career_goals": profile.career_goals if profile else "",
    }

    resume_text = ""
    latest = db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.created_at.desc()).first()
    if latest:
        try:
            resume_text = extract_resume_text(latest.file_path, latest.file_type)
        except Exception:
            pass

    result = await predict_skill_gaps(profile_data, resume_text)

    assessment = SkillAssessment(
        user_id=current_user.id,
        target_role=profile_data["target_role"],
        skill_scores=result.get("skill_scores", {}),
        weekly_roadmap=result.get("weekly_roadmap", []),
        monthly_plan=result.get("monthly_plan", []),
        resources=result.get("resources", []),
        overall_readiness=float(result.get("overall_readiness", 0)),
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    return {
        "id": assessment.id,
        "skill_scores": assessment.skill_scores,
        "overall_readiness": assessment.overall_readiness,
        "weekly_roadmap": assessment.weekly_roadmap,
        "monthly_plan": assessment.monthly_plan,
        "resources": assessment.resources,
    }


@router.get("/history")
def assessment_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    assessments = db.query(SkillAssessment).filter(
        SkillAssessment.user_id == current_user.id
    ).order_by(SkillAssessment.created_at.desc()).limit(10).all()
    return [
        {
            "id": a.id,
            "target_role": a.target_role,
            "overall_readiness": a.overall_readiness,
            "skill_scores": a.skill_scores,
            "created_at": a.created_at.isoformat(),
        }
        for a in assessments
    ]
