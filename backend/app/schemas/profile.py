from typing import Optional
from pydantic import BaseModel


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    college: Optional[str] = None
    branch: Optional[str] = None
    year: Optional[str] = None
    skills: Optional[list[str]] = None
    target_role: Optional[str] = None
    career_goals: Optional[str] = None
    github_username: Optional[str] = None


class ProfileResponse(BaseModel):
    id: int
    user_id: int
    name: str
    college: str
    branch: str
    year: str
    skills: list
    target_role: str
    career_goals: str
    github_username: str

    class Config:
        from_attributes = True
