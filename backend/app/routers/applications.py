from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User, JobApplication, ApplicationStatus, StudentProfile
from app.schemas.application import ApplicationCreate, ApplicationUpdate, ApplicationResponse
from app.services.ai_service import suggest_application_next_steps

router = APIRouter(prefix="/applications", tags=["Applications"])


@router.get("", response_model=list[ApplicationResponse])
def list_applications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    apps = db.query(JobApplication).filter(
        JobApplication.user_id == current_user.id
    ).order_by(JobApplication.updated_at.desc()).all()
    return [
        ApplicationResponse(
            id=a.id,
            company_name=a.company_name,
            role=a.role,
            applied_date=a.applied_date,
            status=a.status.value if hasattr(a.status, "value") else str(a.status),
            notes=a.notes or "",
            ai_suggestions=a.ai_suggestions or [],
        )
        for a in apps
    ]


@router.post("", response_model=ApplicationResponse)
async def create_application(
    data: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    profile_data = {
        "skills": profile.skills if profile else [],
        "target_role": profile.target_role if profile else "",
    }

    suggestions = await suggest_application_next_steps(
        {"company": data.company_name, "role": data.role, "status": "Applied"},
        profile_data,
    )

    app = JobApplication(
        user_id=current_user.id,
        company_name=data.company_name,
        role=data.role,
        notes=data.notes,
        ai_suggestions=suggestions,
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    return ApplicationResponse(
        id=app.id,
        company_name=app.company_name,
        role=app.role,
        applied_date=app.applied_date,
        status=app.status.value,
        notes=app.notes or "",
        ai_suggestions=app.ai_suggestions or [],
    )


@router.put("/{app_id}", response_model=ApplicationResponse)
async def update_application(
    app_id: int,
    data: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = db.query(JobApplication).filter(
        JobApplication.id == app_id,
        JobApplication.user_id == current_user.id,
    ).first()
    if not app:
        raise HTTPException(404, "Application not found")

    if data.status:
        try:
            app.status = ApplicationStatus(data.status)
        except ValueError:
            raise HTTPException(400, f"Invalid status. Use: {[s.value for s in ApplicationStatus]}")
    if data.notes is not None:
        app.notes = data.notes

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    suggestions = await suggest_application_next_steps(
        {"company": app.company_name, "role": app.role, "status": app.status.value},
        {"skills": profile.skills if profile else [], "target_role": profile.target_role if profile else ""},
    )
    app.ai_suggestions = suggestions

    db.commit()
    db.refresh(app)

    return ApplicationResponse(
        id=app.id,
        company_name=app.company_name,
        role=app.role,
        applied_date=app.applied_date,
        status=app.status.value,
        notes=app.notes or "",
        ai_suggestions=app.ai_suggestions or [],
    )


@router.delete("/{app_id}")
def delete_application(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = db.query(JobApplication).filter(
        JobApplication.id == app_id,
        JobApplication.user_id == current_user.id,
    ).first()
    if not app:
        raise HTTPException(404, "Application not found")
    db.delete(app)
    db.commit()
    return {"message": "Deleted"}
