from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User, InterviewSession, Resume, StudentProfile
from app.schemas.interview import InterviewGenerateRequest, InterviewEvaluateRequest, InterviewMoreRequest, InterviewFinishRequest
from app.services.ai_service import (
    generate_interview_questions,
    evaluate_interview_answer,
    extract_resume_text,
    generate_dynamic_question,
    generate_overall_report,
)

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

    # For dynamic questioning, we generate only the FIRST question to start with
    first_question = await generate_dynamic_question(
        target_role=target_role,
        interview_type=data.interview_type,
        difficulty=data.difficulty,
        resume_text=resume_text,
        history=[]
    )
    questions = [first_question]

    session = InterviewSession(
        user_id=current_user.id,
        target_role=target_role,
        questions=questions,
        answers=[],
        feedback={
            "settings": {
                "interview_type": data.interview_type,
                "difficulty": data.difficulty,
                "resume_id": data.resume_id
            }
        },
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

    # Also update session.feedback evaluations mapping
    all_feedback = dict(session.feedback or {})
    evaluations = dict(all_feedback.get("evaluations", {}))
    evaluations[str(data.question_index)] = feedback
    all_feedback["evaluations"] = evaluations
    session.feedback = all_feedback
    db.commit()

    # Infinity Mode: Always generate the next dynamic question
    # Build history for context
    history = []
    for idx, q_item in enumerate(questions):
        ans_item = answers[idx] if idx < len(answers) else {}
        if isinstance(ans_item, dict) and "feedback" in ans_item:
            history.append({
                "question": q_item.get("question", ""),
                "answer": ans_item.get("answer", ""),
                "score": ans_item["feedback"].get("score", 0),
                "feedback": ans_item["feedback"].get("feedback", ""),
            })

    # Dynamic difficulty adjustment based on performance
    settings_dict = dict(all_feedback.get("settings", {}))
    current_difficulty = settings_dict.get("difficulty", "medium")
    score = feedback.get("score", 7)
    if score <= 5:  # Poor answer, reduce difficulty
        if current_difficulty == "hard":
            current_difficulty = "medium"
        elif current_difficulty == "medium":
            current_difficulty = "easy"
    elif score >= 8:  # Excellent answer, increase difficulty
        if current_difficulty == "easy":
            current_difficulty = "medium"
        elif current_difficulty == "medium":
            current_difficulty = "hard"

    settings_dict["difficulty"] = current_difficulty
    all_feedback["settings"] = settings_dict
    session.feedback = all_feedback

    # Get resume context
    resume_text = ""
    resume_id = settings_dict.get("resume_id")
    if resume_id:
        resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
        if resume:
            resume_text = extract_resume_text(resume.file_path, resume.file_type)
    else:
        latest = db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.created_at.desc()).first()
        if latest:
            resume_text = extract_resume_text(latest.file_path, latest.file_type)

    # Generate next dynamic question
    next_q = await generate_dynamic_question(
        target_role=session.target_role,
        interview_type=settings_dict.get("interview_type", "mixed"),
        difficulty=current_difficulty,
        resume_text=resume_text,
        history=history
    )

    # Append next question and save
    questions_list = list(session.questions or [])
    questions_list.append(next_q)
    session.questions = questions_list
    db.commit()

    return {
        "feedback": feedback,
        "next_question": next_q,
        "completed": False
    }


@router.post("/finish")
async def finish_interview(
    data: InterviewFinishRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == data.session_id,
        InterviewSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(404, "Session not found")

    settings_dict = dict(session.feedback.get("settings", {}))
    interview_type = settings_dict.get("interview_type", "mixed")
    difficulty = settings_dict.get("difficulty", "medium")

    # Generate the comprehensive overall report
    report = await generate_overall_report(
        target_role=session.target_role,
        interview_type=interview_type,
        difficulty=difficulty,
        questions=session.questions,
        answers=session.answers
    )

    # Save report to session feedback
    all_feedback = dict(session.feedback or {})
    all_feedback["report"] = report
    all_feedback["duration_seconds"] = data.duration_seconds
    session.feedback = all_feedback
    db.commit()

    return report


@router.get("/session/{session_id}")
def get_session_details(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(404, "Session not found")

    return {
        "id": session.id,
        "target_role": session.target_role,
        "questions": session.questions or [],
        "answers": session.answers or [],
        "feedback": session.feedback or {},
        "created_at": session.created_at.isoformat()
    }


@router.get("/sessions")
def list_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id
    ).order_by(InterviewSession.created_at.desc()).limit(20).all()
    return [
        {
            "id": s.id,
            "target_role": s.target_role,
            "interview_type": s.feedback.get("settings", {}).get("interview_type", "mixed") if s.feedback else "mixed",
            "difficulty": s.feedback.get("settings", {}).get("difficulty", "medium") if s.feedback else "medium",
            "score": s.feedback.get("report", {}).get("overall_score") if s.feedback and "report" in s.feedback else None,
            "duration_seconds": s.feedback.get("duration_seconds", 0) if s.feedback else 0,
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

