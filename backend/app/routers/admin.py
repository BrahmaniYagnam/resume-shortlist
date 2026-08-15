from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.database import get_db
from app.models import User, StudentProfile, Resume, SkillAssessment, UserRole
from app.schemas.admin import AdminDashboardResponse

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/dashboard", response_model=AdminDashboardResponse)
def admin_dashboard(
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    total_students = db.query(User).filter(User.role == UserRole.student).count()

    avg_resume = db.query(func.avg(Resume.ats_score)).scalar() or 0
    avg_readiness = db.query(func.avg(SkillAssessment.overall_readiness)).scalar() or 0

    assessments = db.query(SkillAssessment).order_by(SkillAssessment.created_at.desc()).limit(100).all()
    gap_counter: Counter = Counter()
    readiness_by_role: dict = {}

    for a in assessments:
        scores = a.skill_scores or {}
        for skill, score in scores.items():
            if isinstance(score, (int, float)) and score < 60:
                gap_counter[skill] += 1
        role = a.target_role or "Unknown"
        if role not in readiness_by_role:
            readiness_by_role[role] = []
        readiness_by_role[role].append(a.overall_readiness)

    common_gaps = [{"skill": k, "count": v} for k, v in gap_counter.most_common(8)]
    placement_readiness = [
        {"role": role, "avg_readiness": round(sum(scores) / len(scores), 1)}
        for role, scores in readiness_by_role.items()
    ]

    recent_resumes = db.query(Resume).order_by(Resume.created_at.desc()).limit(10).all()
    recent_activity = []
    for r in recent_resumes:
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == r.user_id).first()
        recent_activity.append({
            "student": profile.name if profile else f"User #{r.user_id}",
            "action": f"Resume analyzed — ATS: {r.ats_score:.0f}%",
            "date": r.created_at.isoformat(),
        })

    return AdminDashboardResponse(
        total_students=total_students,
        avg_resume_score=round(float(avg_resume), 1),
        avg_readiness=round(float(avg_readiness), 1),
        common_skill_gaps=common_gaps,
        placement_readiness=placement_readiness,
        recent_activity=recent_activity,
    )


@router.get("/students")
def list_students(_admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    students = db.query(User).filter(User.role == UserRole.student).all()
    result = []
    for s in students:
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == s.id).first()
        latest_resume = db.query(Resume).filter(Resume.user_id == s.id).order_by(Resume.created_at.desc()).first()
        latest_assessment = db.query(SkillAssessment).filter(
            SkillAssessment.user_id == s.id
        ).order_by(SkillAssessment.created_at.desc()).first()

        result.append({
            "id": s.id,
            "email": s.email,
            "name": profile.name if profile else "",
            "college": profile.college if profile else "",
            "branch": profile.branch if profile else "",
            "target_role": profile.target_role if profile else "",
            "resume_score": latest_resume.ats_score if latest_resume else 0,
            "readiness": latest_assessment.overall_readiness if latest_assessment else 0,
        })
    return result
