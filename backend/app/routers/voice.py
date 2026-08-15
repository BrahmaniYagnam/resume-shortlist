from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User, Conversation, ConversationMessage, StudentProfile
from app.schemas.voice import VoiceChatRequest, VoiceChatResponse
from app.services.ai_service import career_coach_chat
from app.services.rag_service import rag_service

router = APIRouter(prefix="/voice", tags=["Voice Coach"])


@router.post("/chat", response_model=VoiceChatResponse)
async def voice_chat(
    data: VoiceChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == data.conversation_id,
            Conversation.user_id == current_user.id,
        ).first()
        if not conversation:
            raise HTTPException(404, "Conversation not found")
    else:
        conversation = Conversation(user_id=current_user.id, title=data.message[:50])
        db.add(conversation)
        db.flush()

    user_msg = ConversationMessage(
        conversation_id=conversation.id,
        role="user",
        content=data.message,
    )
    db.add(user_msg)

    history = [
        {"role": m.role, "content": m.content}
        for m in conversation.messages
    ]
    history.append({"role": "user", "content": data.message})

    profile_obj = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    profile = {
        "name": profile_obj.name if profile_obj else "",
        "college": profile_obj.college if profile_obj else "",
        "branch": profile_obj.branch if profile_obj else "",
        "skills": profile_obj.skills if profile_obj else [],
        "target_role": profile_obj.target_role if profile_obj else "",
        "career_goals": profile_obj.career_goals if profile_obj else "",
    }

    rag_context = rag_service.query_context(current_user.id, data.message)
    if rag_context:
        profile["relevant_context"] = rag_context

    result = await career_coach_chat(data.message, history, profile)
    reply = result.get("reply", "I'm here to help with your career journey!")
    action_plan = result.get("action_plan", [])

    assistant_msg = ConversationMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=reply,
    )
    db.add(assistant_msg)
    conversation.updated_at = datetime.utcnow()
    db.commit()

    return VoiceChatResponse(
        conversation_id=conversation.id,
        reply=reply,
        action_plan=action_plan,
    )


@router.get("/conversations")
def list_conversations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    convos = db.query(Conversation).filter(
        Conversation.user_id == current_user.id
    ).order_by(Conversation.updated_at.desc()).limit(20).all()
    return [
        {
            "id": c.id,
            "title": c.title,
            "updated_at": c.updated_at.isoformat(),
            "message_count": len(c.messages),
        }
        for c in convos
    ]


@router.get("/conversations/{conversation_id}")
def get_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id,
    ).first()
    if not conversation:
        raise HTTPException(404, "Conversation not found")

    return {
        "id": conversation.id,
        "title": conversation.title,
        "messages": [
            {"role": m.role, "content": m.content, "created_at": m.created_at.isoformat()}
            for m in conversation.messages
        ],
    }
