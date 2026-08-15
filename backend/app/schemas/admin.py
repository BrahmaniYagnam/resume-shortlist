from pydantic import BaseModel


class AdminDashboardResponse(BaseModel):
    total_students: int
    avg_resume_score: float
    avg_readiness: float
    common_skill_gaps: list[dict]
    placement_readiness: list[dict]
    recent_activity: list[dict]
