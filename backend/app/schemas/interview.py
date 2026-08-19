from pydantic import BaseModel


class InterviewGenerateRequest(BaseModel):
    target_role: str = ""
    resume_id: int | None = None
    interview_type: str = "mixed"
    difficulty: str = "medium"


class InterviewEvaluateRequest(BaseModel):
    session_id: int
    question_index: int
    answer: str


class InterviewMoreRequest(BaseModel):
    session_id: int


class InterviewFinishRequest(BaseModel):
    session_id: int
    duration_seconds: int = 0


