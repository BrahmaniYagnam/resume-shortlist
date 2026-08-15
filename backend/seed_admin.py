"""Seed an admin user for the placement dashboard."""
import sys
sys.path.insert(0, ".")

from app.database import SessionLocal, engine, Base
from app.models import User, StudentProfile, UserRole
from app.auth import get_password_hash

Base.metadata.create_all(bind=engine)

db = SessionLocal()
email = "admin@college.edu"
if not db.query(User).filter(User.email == email).first():
    admin = User(
        email=email,
        hashed_password=get_password_hash("admin123"),
        role=UserRole.admin,
    )
    db.add(admin)
    db.flush()
    db.add(StudentProfile(user_id=admin.id, name="Placement Admin", college="Demo College"))
    db.commit()
    print(f"Admin created: {email} / admin123")
else:
    print("Admin already exists")
db.close()
