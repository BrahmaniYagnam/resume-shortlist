from pydantic import BaseModel


class InterviewGenerateRequest(BaseModel):
    target_role: str = ""
    resume_id: int | None = None


class InterviewEvaluateRequest(BaseModel):
    session_id: int
    question_index: int
    answer: str


class InterviewMoreRequest(BaseModel):
    session_id: int

