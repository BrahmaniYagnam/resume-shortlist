from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User, StudentProfile
from app.services.github_service import fetch_github_profile

router = APIRouter(prefix="/github", tags=["GitHub"])


@router.post("/analyze")
async def analyze_github(
    username: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    gh_username = username or (profile.github_username if profile else "")

    if not gh_username:
        raise HTTPException(400, "GitHub username required. Set it in your profile or pass as parameter.")

    token = profile.github_token if profile else ""
    result = await fetch_github_profile(gh_username, token)

    if "error" in result:
        raise HTTPException(404, result["error"])

    if profile and username:
        profile.github_username = username
        db.commit()

    return result
