from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_password_hash, verify_password, get_current_user
from app.database import get_db
from app.models import User, StudentProfile, UserRole
from app.schemas.auth import UserCreate, UserLogin, Token, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=Token)
def signup(data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        role=UserRole.student,
    )
    db.add(user)
    db.flush()

    profile = StudentProfile(user_id=user.id, name=data.name or data.email.split("@")[0])
    db.add(profile)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token)


@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role.value,
        name=profile.name if profile else "",
    )
