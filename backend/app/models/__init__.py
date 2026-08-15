from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime,
    ForeignKey, JSON, Enum as SQLEnum,
)
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class UserRole(str, enum.Enum):
    student = "student"
    admin = "admin"


class ApplicationStatus(str, enum.Enum):
    applied = "Applied"
    online_assessment = "Online Assessment"
    interview = "Interview"
    rejected = "Rejected"
    selected = "Selected"

                                                        
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.student)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    profile = relationship("StudentProfile", back_populates="user", uselist=False)
    resumes = relationship("Resume", back_populates="user")
    applications = relationship("JobApplication", back_populates="user")
    conversations = relationship("Conversation", back_populates="user")
    skill_assessments = relationship("SkillAssessment", back_populates="user")


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    name = Column(String(255), default="")
    college = Column(String(255), default="")
    branch = Column(String(255), default="")
    year = Column(String(50), default="")
    skills = Column(JSON, default=list)
    target_role = Column(String(255), default="")
    career_goals = Column(Text, default="")
    github_username = Column(String(255), default="")
    github_token = Column(String(255), default="")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="profile")


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    filename = Column(String(255))
    file_path = Column(String(500))
    file_type = Column(String(20))
    extracted_data = Column(JSON, default=dict)
    analysis = Column(JSON, default=dict)
    ats_score = Column(Float, default=0)
    quality_score = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="resumes")


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    company_name = Column(String(255))
    role = Column(String(255))
    applied_date = Column(DateTime, default=datetime.utcnow)
    status = Column(SQLEnum(ApplicationStatus), default=ApplicationStatus.applied)
    notes = Column(Text, default="")
    ai_suggestions = Column(JSON, default=list)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="applications")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(255), default="Career Coaching Session")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="conversations")
    messages = relationship("ConversationMessage", back_populates="conversation", order_by="ConversationMessage.created_at")


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    role = Column(String(20))
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")


class SkillAssessment(Base):
    __tablename__ = "skill_assessments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    target_role = Column(String(255))
    skill_scores = Column(JSON, default=dict)
    weekly_roadmap = Column(JSON, default=list)
    monthly_plan = Column(JSON, default=list)
    resources = Column(JSON, default=list)
    overall_readiness = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="skill_assessments")


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    target_role = Column(String(255))
    questions = Column(JSON, default=list)
    answers = Column(JSON, default=list)
    feedback = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
