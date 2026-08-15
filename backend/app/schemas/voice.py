from pydantic import BaseModel


class VoiceChatRequest(BaseModel):
    message: str
    conversation_id: int | None = None


class VoiceChatResponse(BaseModel):
    conversation_id: int
    reply: str
    action_plan: list[str] = []
