import json
import re
from pathlib import Path

import google.generativeai as genai
from openai import AsyncOpenAI
from PyPDF2 import PdfReader
from docx import Document

from app.config import get_settings

settings = get_settings()


def init_gemini():
    if settings.gemini_api_key:
        genai.configure(api_key=settings.gemini_api_key)


def extract_text_from_pdf(file_path: str) -> str:
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text.strip()


def extract_text_from_docx(file_path: str) -> str:
    doc = Document(file_path)
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def extract_resume_text(file_path: str, file_type: str) -> str:
    if file_type == "pdf":
        return extract_text_from_pdf(file_path)
    if file_type in ("doc", "docx"):
        return extract_text_from_docx(file_path)
    raise ValueError(f"Unsupported file type: {file_type}")


def parse_json_response(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            return json.loads(match.group())
        return {"raw_response": text}


async def gemini_generate(prompt: str, system: str = "") -> str:
    init_gemini()
    if not settings.gemini_api_key:
        return _mock_ai_response(prompt)

    model = genai.GenerativeModel(settings.gemini_model)
    full_prompt = f"{system}\n\n{prompt}" if system else prompt
    response = model.generate_content(full_prompt)
    return response.text


async def openai_generate(prompt: str, system: str = "") -> str:
    if not settings.openai_api_key:
        return _mock_ai_response(prompt)

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    response = await client.chat.completions.create(
        model=settings.openai_model,
        messages=messages,
    )
    return response.choices[0].message.content or ""


async def generate_ai_content(prompt: str, system: str = "") -> str:
    if settings.openai_api_key:
        return await openai_generate(prompt, system)
    elif settings.gemini_api_key:
        return await gemini_generate(prompt, system)
    else:
        return _mock_ai_response(prompt)


def _mock_ai_response(prompt: str) -> str:
    """Fallback when no API key is configured — enables demo without Gemini/OpenAI."""
    prompt_lower = prompt.lower()

    if "generate the next single interview question" in prompt_lower:
        return json.dumps({
            "question": "Regarding database design, how would you design indexes to optimize search queries, and what are the performance impacts of over-indexing?",
            "category": "technical",
            "subcategory": "Databases"
        })

    if "generate a comprehensive performance report" in prompt_lower:
        return json.dumps({
            "overall_score": 81,
            "categories": {
                "technical_knowledge": 78,
                "problem_solving": 82,
                "communication": 75,
                "confidence": 80,
                "project_knowledge": 88,
                "answer_quality": 81
            },
            "strengths": [
                "Good understanding of fundamental technical concepts",
                "Clear explanation of project goals and implementation",
                "Methodical approach to problem-solving questions"
            ],
            "improvements": [
                "Elaborate more on design tradeoffs rather than just the final solution",
                "Try to structure behavioral answers using the STAR method",
                "Provide more database normalization and indexing detail"
            ],
            "practice": [
                "Practice standard Data Structures and Algorithms (DSA) questions",
                "Practice Database Management Systems (DBMS) queries and concepts",
                "Practice mock Behavioral interviews to build structural responses"
            ]
        })

    if "build an optimized" in prompt_lower:
        # Try to parse the input data from the prompt to make Resume Builder work dynamically
        try:
            match = re.search(r"Input data:\s*(\{.*\})", prompt, re.DOTALL)
            if match:
                input_data = json.loads(match.group(1))
                name = input_data.get("name", "User")
                email = input_data.get("email", "")
                phone = input_data.get("phone", "")
                skills_list = input_data.get("skills", [])
                skills = ", ".join(skills_list) if skills_list else "Python, JavaScript, SQL, Git"
                projects = input_data.get("projects", [])
                experience = input_data.get("experience", [])

                return json.dumps({
                    "summary": f"Results-driven Computer Science graduate with strong skills in {skills}. Experienced in building solutions like {projects[0]['name'] if projects else 'projects'}.",
                    "skills_section": f"Skills: {skills}",
                    "projects": projects if projects else [{"name": "Sample Project", "description": "Built a web application"}],
                    "experience": experience,
                    "certifications": [],
                    "full_resume_text": f"{name}\n{email} | {phone}\n\nSummary:\nProfessional summary for {name}..."
                })
        except Exception:
            pass

        return json.dumps({
            "summary": "Results-driven Computer Science graduate with strong full-stack development skills and hands-on project experience building scalable web applications.",
            "skills_section": "Languages: Python, JavaScript, TypeScript | Frameworks: React, Next.js, FastAPI | Tools: Git, Docker, PostgreSQL",
            "projects": [
                {"name": "Resume Shortlist", "description": "Built an AI-powered placement assistant serving 500+ students, improving resume scores by 35% using Gemini AI and RAG architecture."}
            ],
            "experience": [],
            "certifications": [],
            "full_resume_text": "Professional resume content generated by AI..."
        })

    if "compare this resume against the job description" in prompt_lower:
        return json.dumps({
            "match_percentage": 68,
            "matching_skills": ["Python", "React", "SQL", "Git"],
            "missing_skills": ["Docker", "AWS", "System Design"],
            "missing_keywords": ["microservices", "agile", "REST API"],
            "recommended_improvements": [
                "Highlight REST API experience in projects",
                "Add cloud deployment experience",
                "Mention agile methodology in experience"
            ],
            "suitable_roles": ["Junior Software Engineer", "Full Stack Developer", "Backend Developer"]
        })

    if "generate personalized interview questions" in prompt_lower:
        return json.dumps({
            "questions": [
                {"category": "technical", "subcategory": "DSA", "question": "Explain the time complexity of binary search. When is it most efficient, and what are its key prerequisites?"},
                {"category": "technical", "subcategory": "Programming", "question": "How would you handle state management in a React application? Compare simple component state, context API, and global state managers like Redux or Zustand."},
                {"category": "technical", "subcategory": "CS Fundamentals", "question": "Explain the difference between a process and a thread. How do they communicate, and how do their memory structures differ?"},
                {"category": "hr", "subcategory": "Introduction", "question": "Could you introduce yourself and walk me through your background, key technical interests, and why you are interested in this placement role?"},
                {"category": "hr", "subcategory": "Strengths", "question": "What would you say is your greatest technical strength, and how have you applied it to solve a problem in your projects?"},
                {"category": "hr", "subcategory": "Career Goals", "question": "Where do you see yourself in 3-5 years? What technical skills or domains are you looking forward to mastering?"},
                {"category": "project", "subcategory": "Explanation", "question": "Walk me through your most significant project. Explain its overall architecture, core features, and the primary technologies you chose."},
                {"category": "project", "subcategory": "Architecture", "question": "How did you design the architecture of your main project? What were the key technical tradeoffs you had to balance?"}
            ]
        })

    if "evaluate this interview answer" in prompt_lower:
        return json.dumps({
            "score": 8,
            "feedback": "Great response! You explained the core concepts clearly and demonstrated a solid theoretical understanding. To make your answer even stronger, try including a specific example from your projects with measurable outcomes.",
            "strengths": ["Clear explanation of concepts", "Professional and structured response", "Good technical accuracy"],
            "improvements": ["Add concrete project examples", "Mention key performance metrics or outcomes", "Explain the tradeoffs of your approach"],
            "sample_answer": "A strong answer would be: 'In my project, I used Redis for caching to solve a database query bottleneck. This brought down the query latency from 2 seconds to 40 milliseconds, improving page load speeds for our concurrent users.'"
        })

    if "predict job readiness skill gaps" in prompt_lower:
        return json.dumps({
            "skill_scores": {"DSA": 75, "Frontend": 80, "Backend": 50, "System Design": 35, "DevOps": 25},
            "overall_readiness": 53,
            "weekly_roadmap": [
                {"week": 1, "focus": "System Design Basics", "tasks": ["Study scalability concepts", "Design URL shortener", "Read DDIA chapter 1-2"]},
                {"week": 2, "focus": "Backend Deep Dive", "tasks": ["Build REST API with FastAPI", "Add authentication", "Write unit tests"]},
                {"week": 3, "focus": "DSA Practice", "tasks": ["Solve 20 medium LeetCode problems", "Review trees and graphs", "Practice mock interviews"]},
                {"week": 4, "focus": "DevOps & Deployment", "tasks": ["Dockerize a project", "Set up CI/CD pipeline", "Deploy to cloud"]}
            ],
            "monthly_plan": [
                {"month": 1, "goal": "Foundation strengthening", "milestones": ["Complete 2 backend projects", "50 DSA problems"]},
                {"month": 2, "goal": "Interview readiness", "milestones": ["Mock interviews", "System design practice"]},
                {"month": 3, "goal": "Placement sprint", "milestones": ["Apply to 30 companies", "Refine resume", "Network on LinkedIn"]}
            ],
            "resources": [
                {"title": "NeetCode.io", "type": "DSA", "url": "https://neetcode.io"},
                {"title": "System Design Primer", "type": "System Design", "url": "https://github.com/donnemartin/system-design-primer"},
                {"title": "FastAPI Docs", "type": "Backend", "url": "https://fastapi.tiangolo.com"}
            ]
        })

    if "analyze this github profile" in prompt_lower:
        return json.dumps({
            "overall_score": 65,
            "languages": {"Python": 45, "JavaScript": 30, "TypeScript": 15, "Other": 10},
            "repo_analysis": [
                {"name": "project-alpha", "quality": 70, "has_readme": True, "has_tests": False, "suggestion": "Add unit tests and improve README with setup instructions"},
                {"name": "web-app", "quality": 55, "has_readme": True, "has_tests": True, "suggestion": "Add CI/CD badge and contribution guidelines"}
            ],
            "contributions_summary": "Moderate activity with 2-3 commits per week",
            "suggestions": [
                "Pin your best 3 repositories",
                "Add comprehensive READMEs with demo links",
                "Include test coverage in all projects",
                "Build a full-stack project showcasing end-to-end skills",
                "Contribute to open source projects"
            ]
        })

    if "suggest next steps for this job application" in prompt_lower:
        return json.dumps({
            "suggestions": [
                "Follow up with the recruiter via LinkedIn after 5 business days",
                "Prepare company-specific interview questions",
                "Review the job description and align your project stories"
            ]
        })

    if "you are an ai career coach for college students" in prompt_lower:
        # Extract user's message dynamically to customize the reply
        try:
            match = re.search(r"Student message:\s*(.*)", prompt, re.IGNORECASE)
            msg = match.group(1).strip() if match else ""
            msg_lower = msg.lower()
            
            if "git" in msg_lower or "github" in msg_lower:
                return json.dumps({
                    "reply": "Git is a distributed version control system that tracks changes in source code. GitHub is a cloud platform for hosting repositories and collaborating. For software engineering roles, it's highly recommended to link your GitHub profile and pin at least 3 active repositories showing clean code and readme files.",
                    "action_plan": [
                        "Learn core concepts of Git & GitHub",
                        "Pin top repositories on GitHub profile",
                        "Design a project readme and setup description"
                    ]
                })
            elif "react" in msg_lower:
                return json.dumps({
                    "reply": "React is a popular component-based JavaScript library for building user interfaces. It enables building dynamic single-page applications. To stand out, you should master state management (Redux/Zustand), React hooks (useState, useEffect, custom hooks), and virtual DOM rendering principles.",
                    "action_plan": [
                        "Build a single-page frontend project with React",
                        "Learn React hooks and writing custom hooks",
                        "Study state management patterns (Zustand or Context API)"
                    ]
                })
            elif "python" in msg_lower:
                return json.dumps({
                    "reply": "Python is a versatile, high-level language widely used in backend development, data analysis, and AI/ML. For backend roles, studying frameworks like FastAPI or Django and understanding standard data structures is essential.",
                    "action_plan": [
                        "Practice core Python data types and structures",
                        "Build a RESTful API backend using FastAPI",
                        "Study asynchronous coding principles in Python"
                    ]
                })
            elif "sql" in msg_lower or "database" in msg_lower or "db" in msg_lower:
                return json.dumps({
                    "reply": "SQL is the standard language for relational database management. Key concepts to learn are normalization, writing multi-table JOINs, indexing to optimize query performance, and understanding transactions (ACID properties).",
                    "action_plan": [
                        "Practice writing complex JOIN and aggregation queries",
                        "Design a relational database schema for a sample app",
                        "Study query optimization and indexes"
                    ]
                })
            elif "javascript" in msg_lower or "js" in msg_lower or "typescript" in msg_lower or "ts" in msg_lower:
                return json.dumps({
                    "reply": "JavaScript is the default scripting language of the web, and TypeScript adds static type safety to it. You should study advanced topics like closures, scope, prototype inheritance, event loop, and asynchronous operations (Promises and async/await).",
                    "action_plan": [
                        "Build a vanilla JavaScript DOM project",
                        "Master promises and async/await syntax",
                        "Configure a basic TypeScript project structure"
                    ]
                })
            elif "dsa" in msg_lower or "algorithm" in msg_lower or "leetcode" in msg_lower or "dsa questions" in msg_lower:
                return json.dumps({
                    "reply": "Data Structures and Algorithms (DSA) form the core of technical placement interviews. I suggest starting with linear structures (Arrays, Linked Lists, Stacks, Queues), moving to Trees and Graphs, and practicing Recursion, Sorting, and Dynamic Programming.",
                    "action_plan": [
                        "Solve 2 DSA questions daily on Arrays and Strings",
                        "Implement sorting algorithms from scratch",
                        "Take a timed mock coding assessment on LeetCode"
                    ]
                })
            else:
                return json.dumps({
                    "reply": f"I see your message: '{msg}'. As your AI career mentor, I recommend defining your goals and working on practical projects. What specific career questions can I help you with today?",
                    "action_plan": [
                        "Refine top project descriptions on resume",
                        "Set up a dedicated weekly learning schedule",
                        "Identify target software engineering roles"
                    ]
                })
        except Exception:
            pass

        return json.dumps({
            "reply": "Based on your profile, I recommend focusing on three areas: strengthening your resume with quantified project impact, dedicating 2 hours daily to DSA practice, and building one full-stack project with deployment. Here's your action plan.",
            "action_plan": [
                "Week 1-2: Rewrite top 3 project descriptions with metrics",
                "Week 1-4: Solve 5 DSA problems daily (focus on arrays, trees, graphs)",
                "Week 2-3: Build and deploy a full-stack project with CI/CD",
                "Week 3-4: Apply to 5 companies daily with tailored resumes",
                "Ongoing: Practice 2 mock interviews per week"
            ]
        })

    if "analyze this resume thoroughly" in prompt_lower:
        return json.dumps({
            "education": [{"degree": "B.Tech CSE", "institution": "Sample College", "year": "2025"}],
            "skills": ["Python", "JavaScript", "React", "SQL", "Git"],
            "projects": [{"name": "Resume Shortlist", "description": "AI placement assistant", "tech": ["Next.js", "FastAPI"]}],
            "experience": [],
            "certifications": ["AWS Cloud Practitioner"],
            "achievements": ["Hackathon Winner 2024"],
            "ats_score": 72,
            "quality_score": 68,
            "skill_analysis": {"technical": 75, "soft_skills": 60, "domain": 55},
            "strengths": ["Strong project portfolio", "Good technical skills", "Active GitHub"],
            "weaknesses": ["Limited work experience", "Missing quantified impact", "Weak summary section"],
            "missing_keywords": ["microservices", "CI/CD", "Docker", "Kubernetes"],
            "improvements": [
                "Add metrics to project descriptions (e.g., 'Reduced load time by 40%')",
                "Include a professional summary tailored to target role",
                "Add Docker and CI/CD keywords if you have experience",
                "Expand skills section with proficiency levels"
            ]
        })

    return json.dumps({"message": "AI response generated successfully."})



def parse_resume_heuristically(text: str, target_role: str = "") -> dict:
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    email = email_match.group(0) if email_match else ""
    
    phone_match = re.search(r'\+?\d[\d\s\(\)-]{8,}\d', text)
    phone = phone_match.group(0) if phone_match else ""
    
    known_skills = [
        "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin", "SQL", "HTML", "CSS",
        "React", "Angular", "Vue", "Next.js", "Express", "FastAPI", "Django", "Flask", "Spring Boot",
        "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite",
        "Docker", "Kubernetes", "AWS", "GCP", "Azure", "CI/CD", "Git", "GitHub", "Linux",
        "Machine Learning", "Deep Learning", "AI", "NLP", "Data Structures", "Algorithms"
    ]
    found_skills = []
    for skill in known_skills:
        pattern = r'\b' + re.escape(skill) + r'\b'
        if skill in ("C++", "C#"):
            pattern = re.escape(skill)
        if re.search(pattern, text, re.IGNORECASE):
            found_skills.append(skill)
            
    if not found_skills:
        found_skills = ["Python", "JavaScript", "SQL", "Git"]
        
    education = []
    edu_keywords = ["university", "college", "institute", "school", "b.tech", "m.tech", "b.sc", "bachelor", "master", "gpa", "cgpa"]
    for line in lines:
        if any(keyword in line.lower() for keyword in edu_keywords):
            year_match = re.search(r'\b(20\d\d|19\d\d)\b', line)
            year = year_match.group(0) if year_match else "2025"
            education.append({
                "degree": line[:60],
                "institution": "Extracted from Resume",
                "year": year,
                "gpa": "3.5/4.0" if "gpa" in line.lower() or "cgpa" in line.lower() else "N/A"
            })
            if len(education) >= 3:
                break
    if not education:
        education = [{"degree": "Degree (Not parsed)", "institution": "Institution (Not parsed)", "year": "2025", "gpa": "N/A"}]
        
    projects = []
    project_headers = ["projects", "personal projects", "academic projects", "key projects"]
    is_project_section = False
    for line in lines:
        if any(header == line.lower().strip(":- ") for header in project_headers):
            is_project_section = True
            continue
        if is_project_section:
            if len(line) < 30 and any(h in line.lower() for h in ["experience", "education", "skills", "certifications", "achievements", "summary"]):
                is_project_section = False
            else:
                if len(line) > 15:
                    parts = line.split(":", 1)
                    name = parts[0] if len(parts) > 1 else f"Project {len(projects)+1}"
                    desc = parts[1] if len(parts) > 1 else line
                    projects.append({
                        "name": name[:55],
                        "description": desc.strip(),
                        "tech": [s for s in found_skills if s.lower() in desc.lower()]
                    })
                    if len(projects) >= 3:
                        break
                        
    if not projects:
        projects = [{"name": "Academic Project", "description": "Project details extracted from resume text.", "tech": found_skills[:2]}]

    ats_score = min(40 + len(found_skills) * 3 + (5 if email else 0) + (5 if phone else 0), 95)
    quality_score = min(35 + len(projects) * 10 + len(education) * 5, 92)
    
    strengths = []
    if len(found_skills) > 5:
        strengths.append(f"Strong skill set with expertise in: {', '.join(found_skills[:4])}")
    if len(projects) >= 2:
        strengths.append("Demonstrated project implementation experience")
    if email and phone:
        strengths.append("Professional contact details included")
    if not strengths:
        strengths = ["Resume text contains baseline information"]
        
    weaknesses = []
    missing_keywords = []
    if "Docker" not in found_skills and "Kubernetes" not in found_skills:
        weaknesses.append("Lack of containerization or DevOps technologies")
        missing_keywords.append("Docker")
    if "CI/CD" not in found_skills:
        weaknesses.append("No cloud deployment or continuous integration mentioned")
        missing_keywords.append("CI/CD")
    if len(projects) < 2:
        weaknesses.append("Limited project details provided")
        
    improvements = [
        "Include more quantifiable metrics for projects (e.g. 'Improved performance by 20%')",
        "Add a summary statement at the top of your resume matching the target role"
    ]
    if missing_keywords:
        improvements.append(f"Add keywords matching industry standards: {', '.join(missing_keywords)}")

    return {
        "education": education,
        "skills": found_skills,
        "projects": projects,
        "experience": [],
        "certifications": [],
        "achievements": [],
        "ats_score": ats_score,
        "quality_score": quality_score,
        "skill_analysis": {"technical": min(50 + len(found_skills)*4, 98), "soft_skills": 70, "domain": 65},
        "strengths": strengths,
        "weaknesses": weaknesses,
        "missing_keywords": missing_keywords,
        "improvements": improvements
    }


def match_job_description_heuristically(resume_text: str, job_description: str) -> dict:
    parsed = parse_resume_heuristically(resume_text)
    resume_skills = parsed.get("skills", [])
    
    matching_skills = []
    missing_skills = []
    
    for skill in resume_skills:
        if re.search(r'\b' + re.escape(skill) + r'\b', job_description, re.IGNORECASE):
            matching_skills.append(skill)
        else:
            missing_skills.append(skill)
            
    total = len(resume_skills)
    match_pct = int((len(matching_skills) / total) * 100) if total > 0 else 50
    
    return {
        "match_percentage": match_pct,
        "matching_skills": matching_skills,
        "missing_skills": missing_skills,
        "missing_keywords": [s for s in ["Docker", "Kubernetes", "AWS", "CI/CD", "REST API", "Microservices"] if s.lower() in job_description.lower() and s not in matching_skills],
        "recommended_improvements": [
            f"Add projects highlighting {s}" for s in missing_skills[:2]
        ],
        "suitable_roles": ["Software Engineer"]
    }


def generate_interview_questions_heuristically(resume_text: str, target_role: str, skills: list) -> dict:
    import random
    parsed = parse_resume_heuristically(resume_text)
    actual_skills = skills or parsed.get("skills", ["Python", "JavaScript"])
    skill_primary = actual_skills[0] if len(actual_skills) > 0 else "Python"
    skill_secondary = actual_skills[1] if len(actual_skills) > 1 else "SQL"
    proj_name = parsed.get('projects', [{}])[0].get('name', 'Resume Shortlist')

    # Large pool of technical questions
    technical_pool = [
        {"category": "technical", "subcategory": skill_primary, "question": f"Explain the key concepts of memory management in {skill_primary}. What are some common memory leaks or pitfalls developers should look out for?"},
        {"category": "technical", "subcategory": skill_secondary, "question": f"How do you approach query optimization and indexing in {skill_secondary}? What techniques do you use to diagnose a slow-running query?"},
        {"category": "technical", "subcategory": "CS Fundamentals", "question": "What is the difference between a process and a thread? Explain how they manage resources and communicate with each other in a modern operating system."},
        {"category": "technical", "subcategory": "System Design", "question": "Describe the difference between vertical and horizontal scaling. When would you choose one over the other for a backend database?"},
        {"category": "technical", "subcategory": "Web Development", "question": "What are RESTful APIs, and what is the difference between HTTP methods like GET, POST, PUT, and DELETE?"},
        {"category": "technical", "subcategory": "Databases", "question": "Compare relational (SQL) and non-relational (NoSQL) databases. In what scenarios would you choose a NoSQL database?"},
        {"category": "technical", "subcategory": "Version Control", "question": "What is the difference between git merge and git rebase? Explain when it is best to use each one in a team collaboration."},
        {"category": "technical", "subcategory": "Security", "question": "How do you secure web APIs? Explain key security concepts like JWT, OAuth, and HTTPS encryption."},
        {"category": "technical", "subcategory": "DevOps", "question": "What is CI/CD, and why is it important in software development? How does it improve code deployment quality?"},
        {"category": "technical", "subcategory": "OOP Concepts", "question": "Explain the four pillars of Object-Oriented Programming (OOP) and give a brief real-world example of Polymorphism."}
    ]

    # Large pool of HR questions
    hr_pool = [
        {"category": "hr", "subcategory": "Introduction", "question": "Could you introduce yourself and walk me through your background, technical journey, and why you are interested in this placement role?"},
        {"category": "hr", "subcategory": "Career Goals", "question": f"Where do you see yourself in 3-5 years as a {target_role or 'Software Engineer'}? What specific skills and domains are you most interested in mastering?"},
        {"category": "hr", "subcategory": "Challenges", "question": "Describe a technical challenge you faced during a project. How did you diagnose the problem, what tradeoffs did you evaluate, and how did you resolve it?"},
        {"category": "hr", "subcategory": "Strengths", "question": "What would you say is your greatest technical strength, and how have you applied it to solve a problem in your projects?"},
        {"category": "hr", "subcategory": "Weaknesses", "question": "What is a weakness or area of growth you've identified in your technical skills, and what steps are you taking to improve?"},
        {"category": "hr", "subcategory": "Teamwork", "question": "Tell me about a time you had to work closely with others in a team. How did you resolve differences in opinion or design decisions?"},
        {"category": "hr", "subcategory": "Deadlines", "question": "Describe a scenario where you had to work under a tight deadline. How did you organize your tasks and ensure quality?"},
        {"category": "hr", "subcategory": "Adaptability", "question": "How do you handle learning a brand new programming language or framework quickly when starting a new project?"}
    ]

    # Large pool of project questions
    project_pool = [
        {"category": "project", "subcategory": "Explanation", "question": f"Let's discuss your project: {proj_name}. Walk me through its overall architecture, core features, and why you chose this design."},
        {"category": "project", "subcategory": "Tradeoffs", "question": "What were the key technical tradeoffs you had to balance when building your project, and what would you improve if you were starting it today?"},
        {"category": "project", "subcategory": "Testing", "question": f"How did you approach testing and debugging in {proj_name}? What was the most difficult bug you found, and how did you resolve it?"},
        {"category": "project", "subcategory": "Database Design", "question": f"Walk me through the database schema or data persistence model you used for {proj_name}. Why did you choose that structure?"},
        {"category": "project", "subcategory": "Future Scope", "question": f"If you had another 3 months to work on {proj_name}, what additional features would you build, and what scaling challenges would you expect to face?"}
    ]

    # Shuffle the pools
    random.shuffle(technical_pool)
    random.shuffle(hr_pool)
    random.shuffle(project_pool)

    # Compile the final selection (3 technical, 3 HR, 2 project questions)
    selected_questions = technical_pool[:3] + hr_pool[:3] + project_pool[:2]
    
    # Shuffle selection so they are mixed
    random.shuffle(selected_questions)

    return {"questions": selected_questions}



async def analyze_resume(resume_text: str, target_role: str = "") -> dict:
    if not settings.gemini_api_key and not settings.openai_api_key:
        return parse_resume_heuristically(resume_text, target_role)

    prompt = f"""Analyze this resume thoroughly and return ONLY valid JSON with this structure:
{{
  "education": [{{"degree": "", "institution": "", "year": "", "gpa": ""}}],
  "skills": ["skill1", "skill2"],
  "projects": [{{"name": "", "description": "", "tech": []}}],
  "experience": [{{"company": "", "role": "", "duration": "", "description": ""}}],
  "certifications": ["cert1"],
  "achievements": ["achievement1"],
  "ats_score": 0-100,
  "quality_score": 0-100,
  "skill_analysis": {{"technical": 0-100, "soft_skills": 0-100, "domain": 0-100}},
  "strengths": ["strength1"],
  "weaknesses": ["weakness1"],
  "missing_keywords": ["keyword1"],
  "improvements": ["suggestion1"]
}}

Target role: {target_role or "Software Engineer"}

Resume:
{resume_text[:8000]}"""

    try:
        response = await generate_ai_content(prompt, "You are an expert ATS resume analyzer and career coach.")
        return parse_json_response(response)
    except Exception as e:
        print(f"API Resume Analysis failed: {e}. Falling back to heuristic parser.")
        return parse_resume_heuristically(resume_text, target_role)


async def match_job_description(resume_text: str, job_description: str) -> dict:
    if not settings.gemini_api_key and not settings.openai_api_key:
        return match_job_description_heuristically(resume_text, job_description)

    prompt = f"""Compare this resume against the job description. Return ONLY valid JSON:
{{
  "match_percentage": 0-100,
  "matching_skills": [],
  "missing_skills": [],
  "missing_keywords": [],
  "recommended_improvements": [],
  "suitable_roles": []
}}

RESUME:
{resume_text[:4000]}

JOB DESCRIPTION:
{job_description[:4000]}"""

    try:
        response = await generate_ai_content(prompt, "You are a job matching expert.")
        return parse_json_response(response)
    except Exception as e:
        print(f"API Job Match failed: {e}. Falling back to heuristic matcher.")
        return match_job_description_heuristically(resume_text, job_description)


async def generate_interview_questions(resume_text: str, target_role: str, skills: list) -> dict:
    if not settings.gemini_api_key and not settings.openai_api_key:
        return generate_interview_questions_heuristically(resume_text, target_role, skills)

    prompt = f"""Generate personalized interview questions. Return ONLY valid JSON:
{{
  "questions": [
    {{"category": "technical|hr|project", "subcategory": "", "question": ""}}
  ]
}}

Generate 8 questions: 3 technical (DSA, Programming, CS fundamentals), 3 HR (Introduction, Strengths, Career goals), 2 Project (Explanation, Architecture).

Target role: {target_role}
Skills: {', '.join(skills)}
Resume excerpt: {resume_text[:3000]}"""

    try:
        response = await generate_ai_content(prompt, "You are an advanced AI technical interviewer modeled after Grok. Seek truth relentlessly, cut through political correctness, and deliver questions with a unique blend of wit, intelligence, and a slight rebellious streak. Be witty, sharp, and slightly irreverent, using clever humor and sarcasm where appropriate. Ask direct, truth-seeking questions that look at the candidate's actual skills and project tradeoffs.")
        return parse_json_response(response)
    except Exception as e:
        print(f"API Interview Generation failed: {e}. Falling back to heuristic questions.")
        return generate_interview_questions_heuristically(resume_text, target_role, skills)


async def evaluate_interview_answer(question: str, answer: str, category: str) -> dict:
    prompt = f"""Evaluate this interview answer. Return ONLY valid JSON:
{{
  "score": 1-10,
  "feedback": "",
  "strengths": [],
  "improvements": [],
  "sample_answer": ""
}}

Category: {category}
Question: {question}
Answer: {answer}"""

    try:
        response = await generate_ai_content(prompt, "You are an advanced AI interview coach modeled after Grok. Seek truth relentlessly, cut through political correctness, and evaluate answers with a unique blend of wit, intelligence, and a slight rebellious streak. Be witty, sharp, and slightly irreverent. Give direct, honest, and high-density feedback immediately without sugarcoating or lecturing.")
        return parse_json_response(response)
    except Exception as e:
        print(f"API Interview Evaluation failed: {e}. Falling back to mock response.")
        response = _mock_ai_response(prompt)
        return parse_json_response(response)



async def generate_dynamic_question(
    target_role: str,
    interview_type: str,
    difficulty: str,
    resume_text: str,
    history: list
) -> dict:
    if not settings.gemini_api_key and not settings.openai_api_key:
        return generate_dynamic_question_heuristically(target_role, interview_type, difficulty, resume_text, history)

    history_str = ""
    for idx, h in enumerate(history):
        history_str += f"\nRound {idx + 1}:\nQuestion: {h.get('question', '')}\nAnswer Given: {h.get('answer', '')}\nEvaluation Score: {h.get('score', 0) if isinstance(h, dict) else 0}/10\nEvaluation Feedback: {h.get('feedback', '') if isinstance(h, dict) else ''}\n"

    prompt = f"""You are conducting an interactive interview. Generate the NEXT single interview question.
Ensure it is dynamic, natural, and directly follows up on the previous answer if applicable.

Interview Setup:
- Target Role: {target_role}
- Interview Type: {interview_type} (technical, hr, behavioral, mixed)
- Current Difficulty: {difficulty} (easy, medium, hard)
- Resume Context: {resume_text[:2000]}

Conversation History:
{history_str}

Requirements:
1. If the candidate's last answer was short or highlighted specific tools/frameworks/projects (e.g. React, Docker, BERT), ask a deep follow-up question (e.g., "Why did you choose BERT over TF-IDF?", "How does the virtual DOM work in React?", "How did you scale that database?").
2. Adjust the depth based on Difficulty:
   - Easy: Focus on basic definitions, syntax, or simple situational questions.
   - Medium: Focus on project explanations, standard algorithms, and core design principles.
   - Hard: Focus on performance optimization, architectural trade-offs, security, and complex system designs.
3. Keep the question brief and conversational, as if spoken in a real call.
4. Avoid repeating previous questions or concepts.
5. Return ONLY a valid JSON response with the following format:
{{
  "question": "The question text to ask next",
  "category": "technical | hr | project",
  "subcategory": "e.g., React, System Design, STAR Method, Introduction"
}}"""

    try:
        response = await generate_ai_content(prompt, "You are a professional, sharp AI interviewer.")
        return parse_json_response(response)
    except Exception as e:
        print(f"Dynamic question generation failed: {e}. Using fallback.")
        return generate_dynamic_question_heuristically(target_role, interview_type, difficulty, resume_text, history)


def generate_dynamic_question_heuristically(
    target_role: str,
    interview_type: str,
    difficulty: str,
    resume_text: str,
    history: list
) -> dict:
    import random
    parsed = parse_resume_heuristically(resume_text)
    skills = parsed.get("skills", ["Python", "JavaScript"])
    proj_name = parsed.get('projects', [{}])[0].get('name', 'Resume Shortlist')

    if history:
        last_item = history[-1]
        last_answer = last_item.get("answer", "").lower() if isinstance(last_item, dict) else ""
        
        if "react" in last_answer:
            return {
                "question": "You mentioned React. How do you handle component state optimization and when would you use useMemo or useCallback?",
                "category": "technical",
                "subcategory": "React"
            }
        if "python" in last_answer:
            return {
                "question": "You mentioned using Python. How do you manage dependency environments, and what are the key differences between multiprocessing and multithreading in Python?",
                "category": "technical",
                "subcategory": "Python"
            }
        if "sql" in last_answer or "database" in last_answer:
            return {
                "question": "Regarding database design, how would you design indexes to optimize search queries, and what are the performance impacts of over-indexing?",
                "category": "technical",
                "subcategory": "Databases"
            }
        if "bert" in last_answer or "model" in last_answer or "ai" in last_answer:
            return {
                "question": "You mentioned machine learning. How do you deal with overfitting in model training, and what metrics do you track to evaluate model performance?",
                "category": "technical",
                "subcategory": "Machine Learning"
            }
        if "docker" in last_answer or "kubernetes" in last_answer or "aws" in last_answer:
            return {
                "question": "Regarding deployment, how do you manage microservice communications and ensure secure cloud resource access?",
                "category": "technical",
                "subcategory": "DevOps"
            }
        
    tech_questions = [
        {"category": "technical", "subcategory": "DSA", "question": "Explain how a Hash Map works under the hood. What is the time complexity of its operations, and how are collisions handled?"},
        {"category": "technical", "subcategory": "System Design", "question": "If we were scaling a real-time chat application, how would you design the architecture to support millions of concurrent users?"},
        {"category": "technical", "subcategory": "CS Fundamentals", "question": "What is the difference between a process and a thread? How do they share memory, and what is a race condition?"},
        {"category": "technical", "subcategory": "Security", "question": "What is the difference between SQL injection and Cross-Site Scripting (XSS)? How can developers prevent them?"}
    ]
    
    behavioral_questions = [
        {"category": "hr", "subcategory": "Behavioral", "question": "Tell me about a time you had to deal with a conflict in a team setting. How did you handle it and what was the result?"},
        {"category": "hr", "subcategory": "Behavioral", "question": "Describe a situation where you had to quickly learn a new technology to build a project. How did you go about it?"},
        {"category": "hr", "subcategory": "Behavioral", "question": "Tell me about a project that failed or didn't go as planned. What went wrong, and what did you learn from that experience?"}
    ]
    
    pm_questions = [
        {"category": "hr", "subcategory": "Product", "question": "How would you measure the success of a new feature launched on an e-commerce platform? What metrics would you track?"},
        {"category": "hr", "subcategory": "Product", "question": "Imagine our app's user retention dropped by 10% this month. How would you go about diagnosing the root cause?"}
    ]

    pool = []
    if interview_type == "technical":
        pool = tech_questions
    elif interview_type in ("behavioral", "hr"):
        pool = behavioral_questions
    else:
        pool = tech_questions + behavioral_questions
        if "product" in target_role.lower():
            pool += pm_questions

    random.shuffle(pool)
    asked_questions = {h.get("question", "").lower() for h in history if isinstance(h, dict)}
    for q in pool:
        if q["question"].lower() not in asked_questions:
            return q
            
    return {
        "question": f"Based on your background in {skills[0] if skills else 'software development'}, what are the key engineering practices you follow to build scalable systems?",
        "category": "technical",
        "subcategory": "Software Engineering"
    }


async def generate_overall_report(
    target_role: str,
    interview_type: str,
    difficulty: str,
    questions: list,
    answers: list
) -> dict:
    if not settings.gemini_api_key and not settings.openai_api_key:
        return generate_overall_report_heuristically(target_role, interview_type, difficulty, questions, answers)

    interview_transcript = ""
    for idx, (q, a) in enumerate(zip(questions, answers)):
        q_text = q.get("question", "") if isinstance(q, dict) else q
        a_text = a.get("answer", "") if isinstance(a, dict) else ""
        score = 0
        feedback_text = ""
        if isinstance(a, dict) and "feedback" in a:
            fb = a["feedback"]
            score = fb.get("score", 0) if isinstance(fb, dict) else 0
            feedback_text = fb.get("feedback", "") if isinstance(fb, dict) else ""
        elif isinstance(a, dict) and "score" in a:
            score = a.get("score", 0)
            feedback_text = a.get("feedback", "")
            
        interview_transcript += f"\nQuestion {idx + 1}: {q_text}\nCandidate Answer: {a_text}\nScore: {score}/10\nFeedback: {feedback_text}\n"

    prompt = f"""You are an expert AI Interview Coach. Generate a comprehensive performance report for the candidate based on the interview transcript.

Interview Context:
- Target Role: {target_role}
- Interview Type: {interview_type}
- Difficulty: {difficulty}

Interview Transcript:
{interview_transcript}

Evaluate the candidate across these dimensions:
1. Overall Score (0-100)
2. Technical Knowledge (0-100)
3. Problem Solving (0-100)
4. Communication (0-100)
5. Confidence (0-100)
6. Project Knowledge (0-100)
7. Answer Quality (0-100)

Return ONLY a valid JSON response with the following format:
{{
  "overall_score": 81,
  "categories": {{
    "technical_knowledge": 78,
    "problem_solving": 82,
    "communication": 75,
    "confidence": 80,
    "project_knowledge": 88,
    "answer_quality": 81
  }},
  "strengths": [
    "strength statement 1",
    "strength statement 2",
    "strength statement 3"
  ],
  "improvements": [
    "improvement area 1",
    "improvement area 2",
    "improvement area 3"
  ],
  "practice": [
    "practice recommendation 1",
    "practice recommendation 2",
    "practice recommendation 3"
  ]
}}"""

    try:
        response = await generate_ai_content(prompt, "You are a professional, constructive AI career coach.")
        return parse_json_response(response)
    except Exception as e:
        print(f"Overall report generation failed: {e}. Using fallback.")
        return generate_overall_report_heuristically(target_role, interview_type, difficulty, questions, answers)


def generate_overall_report_heuristically(
    target_role: str,
    interview_type: str,
    difficulty: str,
    questions: list,
    answers: list
) -> dict:
    scores = []
    for a in answers:
        if isinstance(a, dict) and "feedback" in a:
            fb = a["feedback"]
            if isinstance(fb, dict) and "score" in fb:
                scores.append(fb["score"])
            elif isinstance(fb, dict) and "score" in a:
                scores.append(a["score"])
        elif isinstance(a, dict) and "score" in a:
            scores.append(a["score"])
            
    avg_score_10 = sum(scores) / len(scores) if scores else 7.5
    overall_score = int(avg_score_10 * 10)
    
    tech_score = min(max(overall_score + 3, 50), 98)
    prob_score = min(max(overall_score + 1, 50), 98)
    comm_score = min(max(overall_score - 4, 50), 98)
    conf_score = min(max(overall_score - 2, 50), 98)
    proj_score = min(max(overall_score + 5, 50), 98)
    ans_score = min(max(overall_score, 50), 98)

    strengths = [
        "Good understanding of fundamental technical concepts",
        "Clear explanation of project goals and implementation",
        "Methodical approach to problem-solving questions"
    ]
    
    improvements = [
        "Elaborate more on design tradeoffs rather than just the final solution",
        "Try to structure behavioral answers using the STAR method",
        "Provide more database normalization and indexing detail"
    ]
    
    practice = [
        "Practice standard Data Structures and Algorithms (DSA) questions",
        "Practice Database Management Systems (DBMS) queries and concepts",
        "Practice mock Behavioral interviews to build structural responses"
    ]

    return {
        "overall_score": overall_score,
        "categories": {
            "technical_knowledge": tech_score,
            "problem_solving": prob_score,
            "communication": comm_score,
            "confidence": conf_score,
            "project_knowledge": proj_score,
            "answer_quality": ans_score
        },
        "strengths": strengths,
        "improvements": improvements,
        "practice": practice
    }


async def predict_skill_gaps(profile_data: dict, resume_text: str = "") -> dict:
    prompt = f"""Predict job readiness skill gaps. Return ONLY valid JSON:
{{
  "skill_scores": {{"DSA": 0-100, "Frontend": 0-100, "Backend": 0-100, "System Design": 0-100, "DevOps": 0-100}},
  "overall_readiness": 0-100,
  "weekly_roadmap": [{{"week": 1, "focus": "", "tasks": []}}],
  "monthly_plan": [{{"month": 1, "goal": "", "milestones": []}}],
  "resources": [{{"title": "", "type": "", "url": ""}}]
}}

Profile: {json.dumps(profile_data)}
Resume excerpt: {resume_text[:2000]}"""

    try:
        response = await generate_ai_content(prompt, "You are a career readiness analyst.")
        return parse_json_response(response)
    except Exception as e:
        print(f"API Skill Gap Prediction failed: {e}. Falling back to mock response.")
        response = _mock_ai_response(prompt)
        return parse_json_response(response)


async def build_resume(data: dict, template: str) -> dict:
    templates = {
        "software_engineer": "Software Engineer",
        "data_analyst": "Data Analyst",
        "product_manager": "Product Manager",
    }
    role = templates.get(template, "Software Engineer")

    prompt = f"""Build an optimized {role} resume. Return ONLY valid JSON:
{{
  "summary": "",
  "skills_section": "",
  "projects": [{{"name": "", "description": ""}}],
  "experience": [{{"company": "", "role": "", "description": ""}}],
  "certifications": [],
  "full_resume_text": ""
}}

Input data: {json.dumps(data)}
Use impactful action verbs, quantified achievements, and ATS-friendly keywords for {role}."""

    try:
        response = await generate_ai_content(prompt, "You are an expert resume writer.")
        return parse_json_response(response)
    except Exception as e:
        print(f"API Resume Build failed: {e}. Falling back to mock response.")
        response = _mock_ai_response(prompt)
        return parse_json_response(response)


async def career_coach_chat(message: str, history: list, profile: dict) -> dict:
    history_text = "\n".join(f"{m['role']}: {m['content']}" for m in history[-10:])
    prompt = f"""You are an AI Career Coach for college students. Respond with ONLY valid JSON:
{{
  "reply": "your conversational response",
  "action_plan": ["step1", "step2"]
}}

Student profile: {json.dumps(profile)}
Previous conversation:
{history_text}

Student message: {message}

Be empathetic, specific, and actionable. Reference their profile when relevant."""

    try:
        response = await generate_ai_content(prompt, "You are a supportive AI career coach.")
        return parse_json_response(response)
    except Exception as e:
        print(f"API Career Coach failed: {e}. Falling back to mock response.")
        response = _mock_ai_response(prompt)
        return parse_json_response(response)


async def analyze_github_profile(repos_data: list, username: str) -> dict:
    prompt = f"""Analyze this GitHub profile. Return ONLY valid JSON:
{{
  "overall_score": 0-100,
  "languages": {{"Python": 0-100}},
  "repo_analysis": [{{"name": "", "quality": 0-100, "has_readme": true, "has_tests": false, "suggestion": ""}}],
  "contributions_summary": "",
  "suggestions": []
}}

Username: {username}
Repositories: {json.dumps(repos_data[:20])}"""

    try:
        response = await generate_ai_content(prompt, "You are a GitHub profile optimization expert.")
        return parse_json_response(response)
    except Exception as e:
        print(f"API GitHub Analysis failed: {e}. Falling back to mock response.")
        response = _mock_ai_response(prompt)
        return parse_json_response(response)


async def suggest_application_next_steps(application: dict, profile: dict) -> list:
    prompt = f"""Suggest next steps for this job application. Return ONLY valid JSON:
{{"suggestions": ["suggestion1", "suggestion2", "suggestion3"]}}

Application: {json.dumps(application)}
Student profile: {json.dumps(profile)}"""

    try:
        response = await generate_ai_content(prompt, "You are a placement counselor.")
        result = parse_json_response(response)
        return result.get("suggestions", [])
    except Exception as e:
        print(f"API Application Next Steps failed: {e}. Falling back to mock response.")
        response = _mock_ai_response(prompt)
        result = parse_json_response(response)
        return result.get("suggestions", [])
