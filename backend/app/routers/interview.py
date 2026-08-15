from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User, InterviewSession, Resume, StudentProfile
from app.schemas.interview import InterviewGenerateRequest, InterviewEvaluateRequest, InterviewMoreRequest
from app.services.ai_service import generate_interview_questions, evaluate_interview_answer, extract_resume_text

router = APIRouter(prefix="/interview", tags=["Interview"])


@router.post("/generate")
async def generate_questions(
    data: InterviewGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    target_role = data.target_role or (profile.target_role if profile else "Software Engineer")
    skills = profile.skills if profile and profile.skills else []

    resume_text = ""
    if data.resume_id:
        resume = db.query(Resume).filter(Resume.id == data.resume_id, Resume.user_id == current_user.id).first()
        if resume:
            resume_text = extract_resume_text(resume.file_path, resume.file_type)
    else:
        latest = db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.created_at.desc()).first()
        if latest:
            resume_text = extract_resume_text(latest.file_path, latest.file_type)

    result = await generate_interview_questions(resume_text, target_role, skills)
    questions = result.get("questions", [])

    session = InterviewSession(
        user_id=current_user.id,
        target_role=target_role,
        questions=questions,
        answers=[],
        feedback={},
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {"session_id": session.id, "questions": questions}


@router.post("/evaluate")
async def evaluate_answer(
    data: InterviewEvaluateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == data.session_id,
        InterviewSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(404, "Session not found")

    questions = session.questions or []
    if data.question_index >= len(questions):
        raise HTTPException(400, "Invalid question index")

    q = questions[data.question_index]
    feedback = await evaluate_interview_answer(
        q.get("question", ""),
        data.answer,
        q.get("category", "general"),
    )

    answers = list(session.answers or [])
    while len(answers) <= data.question_index:
        answers.append({})
    answers[data.question_index] = {"answer": data.answer, "feedback": feedback}
    session.answers = answers

    all_feedback = dict(session.feedback or {})
    all_feedback[str(data.question_index)] = feedback
    session.feedback = all_feedback

    db.commit()
    return feedback


@router.get("/sessions")
def list_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id
    ).order_by(InterviewSession.created_at.desc()).limit(20).all()
    return [
        {
            "id": s.id,
            "target_role": s.target_role,
            "question_count": len(s.questions or []),
            "created_at": s.created_at.isoformat(),
        }
        for s in sessions
    ]


@router.post("/more")
async def load_more_questions(
    data: InterviewMoreRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == data.session_id,
        InterviewSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(404, "Session not found")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    target_role = session.target_role or (profile.target_role if profile else "Software Engineer")
    skills = profile.skills if profile and profile.skills else []

    latest_resume = db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.created_at.desc()).first()
    resume_text = ""
    if latest_resume:
        resume_text = extract_resume_text(latest_resume.file_path, latest_resume.file_type)

    result = await generate_interview_questions(resume_text, target_role, skills)
    new_questions = result.get("questions", [])

    session_questions = list(session.questions or [])
    session_questions.extend(new_questions)
    session.questions = session_questions

    db.commit()
    db.refresh(session)

    return {"session_id": session.id, "questions": session.questions}

