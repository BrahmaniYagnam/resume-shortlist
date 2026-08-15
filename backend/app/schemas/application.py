from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ApplicationCreate(BaseModel):
    company_name: str
    role: str
    notes: str = ""


class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: int
    company_name: str
    role: str
    applied_date: datetime
    status: str
    notes: str
    ai_suggestions: list

    class Config:
        from_attributes = True
