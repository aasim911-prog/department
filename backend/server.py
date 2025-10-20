from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT and Password settings
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class UserRegister(BaseModel):
    name: str
    email: Optional[str] = None
    student_id: Optional[str] = None
    role: str  # "teacher" or "student"
    department: str
    semester: Optional[int] = None  # For students only

class UserLogin(BaseModel):
    identifier: str  # email for teachers, student_id for students
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: Optional[str] = None
    student_id: Optional[str] = None
    role: str
    department: str
    semester: Optional[int] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SubjectCreate(BaseModel):
    name: str
    code: str
    semester: int
    credits: int
    department: str

class Subject(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str
    semester: int
    credits: int
    department: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MarksCreate(BaseModel):
    student_id: str
    subject_id: str
    semester: int
    internal1: Optional[float] = None
    internal2: Optional[float] = None
    internal3: Optional[float] = None
    final_exam: Optional[float] = None

class Marks(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    subject_id: str
    semester: int
    internal1: Optional[float] = None
    internal2: Optional[float] = None
    internal3: Optional[float] = None
    final_exam: Optional[float] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Helper Functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def calculate_grade_point(marks: float) -> float:
    """Convert marks to 10-point grade scale"""
    if marks >= 90:
        return 10.0
    elif marks >= 80:
        return 9.0
    elif marks >= 70:
        return 8.0
    elif marks >= 60:
        return 7.0
    elif marks >= 50:
        return 6.0
    elif marks >= 40:
        return 5.0
    else:
        return 0.0

# Auth Routes
@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    if user_data.role == "teacher":
        existing = await db.users.find_one({"email": user_data.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
    else:
        existing = await db.users.find_one({"student_id": user_data.student_id})
        if existing:
            raise HTTPException(status_code=400, detail="Student ID already registered")
    
    user = User(**user_data.model_dump())
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    
    token_data = {"sub": user.id, "role": user.role}
    token = create_access_token(token_data)
    
    return {"token": token, "user": user}

@api_router.post("/auth/login")
async def login(login_data: UserLogin):
    # Simple password check
    if login_data.password not in ["student", "teacher"]:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Find user
    if "@" in login_data.identifier:
        user_doc = await db.users.find_one({"email": login_data.identifier}, {"_id": 0})
        if not user_doc or login_data.password != "teacher":
            raise HTTPException(status_code=401, detail="Invalid credentials")
    else:
        user_doc = await db.users.find_one({"student_id": login_data.identifier}, {"_id": 0})
        if not user_doc or login_data.password != "student":
            raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    token_data = {"sub": user_doc['id'], "role": user_doc['role']}
    token = create_access_token(token_data)
    
    return {"token": token, "user": user_doc}

@api_router.get("/auth/me")
async def get_current_user(token_data: dict = Depends(verify_token)):
    user_doc = await db.users.find_one({"id": token_data["sub"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return user_doc

# Subject Routes
@api_router.post("/subjects", response_model=Subject)
async def create_subject(subject_data: SubjectCreate, token_data: dict = Depends(verify_token)):
    if token_data["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create subjects")
    
    # Check if subject code already exists
    existing = await db.subjects.find_one({"code": subject_data.code, "semester": subject_data.semester})
    if existing:
        raise HTTPException(status_code=400, detail="Subject code already exists for this semester")
    
    subject = Subject(**subject_data.model_dump())
    doc = subject.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.subjects.insert_one(doc)
    return subject

@api_router.get("/subjects", response_model=List[Subject])
async def get_subjects(semester: Optional[int] = None, department: Optional[str] = None):
    query = {}
    if semester:
        query["semester"] = semester
    if department:
        query["department"] = department
    
    subjects = await db.subjects.find(query, {"_id": 0}).to_list(1000)
    
    for subject in subjects:
        if isinstance(subject['created_at'], str):
            subject['created_at'] = datetime.fromisoformat(subject['created_at'])
    
    return subjects

@api_router.delete("/subjects/{subject_id}")
async def delete_subject(subject_id: str, token_data: dict = Depends(verify_token)):
    if token_data["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can delete subjects")
    
    result = await db.subjects.delete_one({"id": subject_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    return {"message": "Subject deleted successfully"}

# Marks Routes
@api_router.post("/marks", response_model=Marks)
async def create_or_update_marks(marks_data: MarksCreate, token_data: dict = Depends(verify_token)):
    if token_data["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can upload marks")
    
    # Check if marks already exist
    existing = await db.marks.find_one({
        "student_id": marks_data.student_id,
        "subject_id": marks_data.subject_id
    })
    
    if existing:
        # Update existing marks
        update_data = marks_data.model_dump()
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        await db.marks.update_one(
            {"student_id": marks_data.student_id, "subject_id": marks_data.subject_id},
            {"$set": update_data}
        )
        
        updated_doc = await db.marks.find_one(
            {"student_id": marks_data.student_id, "subject_id": marks_data.subject_id},
            {"_id": 0}
        )
        if isinstance(updated_doc['updated_at'], str):
            updated_doc['updated_at'] = datetime.fromisoformat(updated_doc['updated_at'])
        return updated_doc
    else:
        # Create new marks
        marks = Marks(**marks_data.model_dump())
        doc = marks.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        
        await db.marks.insert_one(doc)
        return marks

@api_router.get("/marks/student/{student_id}")
async def get_student_marks(student_id: str, token_data: dict = Depends(verify_token)):
    marks_list = await db.marks.find({"student_id": student_id}, {"_id": 0}).to_list(1000)
    
    for marks in marks_list:
        if isinstance(marks['updated_at'], str):
            marks['updated_at'] = datetime.fromisoformat(marks['updated_at'])
    
    return marks_list

@api_router.get("/marks/subject/{subject_id}")
async def get_subject_marks(subject_id: str, token_data: dict = Depends(verify_token)):
    if token_data["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can view all marks")
    
    marks_list = await db.marks.find({"subject_id": subject_id}, {"_id": 0}).to_list(1000)
    
    for marks in marks_list:
        if isinstance(marks['updated_at'], str):
            marks['updated_at'] = datetime.fromisoformat(marks['updated_at'])
    
    return marks_list

@api_router.get("/students")
async def get_students(department: Optional[str] = None, semester: Optional[int] = None, token_data: dict = Depends(verify_token)):
    if token_data["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can view students")
    
    query = {"role": "student"}
    if department:
        query["department"] = department
    if semester:
        query["semester"] = semester
    
    students = await db.users.find(query, {"_id": 0}).to_list(1000)
    
    for student in students:
        if isinstance(student['created_at'], str):
            student['created_at'] = datetime.fromisoformat(student['created_at'])
    
    return students

@api_router.get("/dashboard/student/{student_id}")
async def get_student_dashboard(student_id: str, token_data: dict = Depends(verify_token)):
    # Get student info
    student = await db.users.find_one({"student_id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get all marks using the student's database ID
    marks_list = await db.marks.find({"student_id": student["id"]}, {"_id": 0}).to_list(1000)
    
    # Get all subjects
    all_subjects = await db.subjects.find({"department": student["department"]}, {"_id": 0}).to_list(1000)
    
    # Calculate SGPA for each semester and overall CGPA
    semester_data = {}
    
    for sem in range(1, 9):
        sem_subjects = [s for s in all_subjects if s["semester"] == sem]
        sem_marks = [m for m in marks_list if m["semester"] == sem]
        
        total_credits = 0
        total_grade_points = 0
        subjects_with_marks = []
        
        for subject in sem_subjects:
            mark_entry = next((m for m in sem_marks if m["subject_id"] == subject["id"]), None)
            
            if mark_entry and mark_entry.get("final_exam") is not None:
                final_marks = mark_entry["final_exam"]
                grade_point = calculate_grade_point(final_marks)
                
                total_credits += subject["credits"]
                total_grade_points += grade_point * subject["credits"]
                
                subjects_with_marks.append({
                    "subject": subject,
                    "marks": mark_entry,
                    "grade_point": grade_point
                })
        
        sgpa = total_grade_points / total_credits if total_credits > 0 else 0
        
        semester_data[f"semester_{sem}"] = {
            "semester": sem,
            "sgpa": round(sgpa, 2),
            "subjects": subjects_with_marks,
            "total_credits": total_credits
        }
    
    # Calculate overall CGPA
    total_credits_all = 0
    total_grade_points_all = 0
    
    for sem_key, sem_info in semester_data.items():
        total_credits_all += sem_info["total_credits"]
        total_grade_points_all += sem_info["sgpa"] * sem_info["total_credits"]
    
    cgpa = total_grade_points_all / total_credits_all if total_credits_all > 0 else 0
    
    return {
        "student": student,
        "semester_data": semester_data,
        "cgpa": round(cgpa, 2)
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()