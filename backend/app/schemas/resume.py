from typing import Optional
from pydantic import BaseModel


class ResumeAnalysisResponse(BaseModel):
    id: int
    filename: str
    ats_score: float
    quality_score: float
    extracted_data: dict
    analysis: dict

    class Config:
        from_attributes = True


class ResumeBuildRequest(BaseModel):
    template: str  # software_engineer, data_analyst, product_manager
    name: str
    email: str
    phone: str = ""
    education: list[dict] = []
    skills: list[str] = []
    projects: list[dict] = []
    experience: list[dict] = []
    certifications: list[str] = []


class JobMatchRequest(BaseModel):
    job_description: str
    resume_id: Optional[int] = None
