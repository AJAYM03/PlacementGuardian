from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Field, Session, create_engine, select
from typing import Optional
from contextlib import asynccontextmanager
import httpx
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import secrets
# Import our custom security functions

from security import create_access_token, verify_token

import os
from dotenv import load_dotenv

# Load the variables from the .env file into the system
load_dotenv()
# ==========================================
# 1. DATABASE CONFIGURATION
# ==========================================
sqlite_file_name = "placement.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"
engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

# ==========================================
# 1.5 ADMIN SECURITY BOUNCER
# ==========================================
# ==========================================
# 1.5 ADMIN SECURITY BOUNCER
# ==========================================
security_basic = HTTPBasic()

def verify_admin(credentials: HTTPBasicCredentials = Depends(security_basic)):
    # Pull credentials from the secure .env vault
    expected_username = os.getenv("ADMIN_USERNAME", "admin")
    expected_password = os.getenv("ADMIN_PASSWORD", "password")
    
    correct_username = secrets.compare_digest(credentials.username, expected_username)
    correct_password = secrets.compare_digest(credentials.password, expected_password)
    
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

# ==========================================
# 2. ACADEMIC PROFILE MODELS
# ==========================================
class AcademicProfileBase(SQLModel):
    full_name: str = Field(min_length=2, max_length=50)
    personal_email: str
    college_uid: str
    phone_number: str = Field(regex=r"^\d{10}$", description="Must be exactly 10 digits")
    tenth_percentage: float = Field(ge=0.0, le=100.0)
    twelfth_percentage: float = Field(ge=0.0, le=100.0)
    btech_cgpa: float = Field(ge=0.0, le=10.0)
    branch: str = Field(default="Computer Science Engineering")
    active_backlogs: int = Field(default=0, ge=0)
    linkedin_url: Optional[str] = Field(default=None)
    github_url: Optional[str] = Field(default=None)
    portfolio_url: Optional[str] = Field(default=None)

class AcademicProfile(AcademicProfileBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

class AcademicProfileCreate(AcademicProfileBase):
    pass 

class AcademicProfileUpdate(SQLModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=50)
    personal_email: Optional[str] = None
    college_uid: Optional[str] = None
    phone_number: Optional[str] = Field(default=None, regex=r"^\d{10}$")
    tenth_percentage: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    twelfth_percentage: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    btech_cgpa: Optional[float] = Field(default=None, ge=0.0, le=10.0)
    branch: Optional[str] = None
    active_backlogs: Optional[int] = Field(default=None, ge=0)
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None

# ==========================================
# 3. RESUME VAULT MODELS
# ==========================================
class ResumeVaultBase(SQLModel):
    resume_name: str = Field(description="e.g., 'Cybersecurity Focus', 'General SDE'")
    drive_link: str = Field(description="Google Drive shareable link", regex=r"^https?://[^\s]+$")
    is_default: bool = Field(default=False)
    profile_id: int = Field(foreign_key="academicprofile.id") 

class ResumeVault(ResumeVaultBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

class ResumeVaultCreate(SQLModel):
    resume_name: str
    drive_link: str = Field(regex=r"^https?://[^\s]+$")
    is_default: bool = False
# ==========================================
# 3.5 PLACEMENT DRIVE MODELS (The Broadcast System)
# ==========================================
class PlacementDriveBase(SQLModel):
    company_name: str
    role_summary: str
    deadline_text: str
    apply_link: str
    is_active: bool = Field(default=True)
    clicks_count: int = Field(default=0)
    applied_count: int = Field(default=0)
    
    # --- NEW ELIGIBILITY FIELDS ---
    min_cgpa: float = Field(default=0.0)
    max_backlogs: int = Field(default=10)
    allowed_branch: str = Field(default="ALL")

class PlacementDrive(PlacementDriveBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

class PlacementDriveCreate(PlacementDriveBase):
    pass
# ==========================================
# 4. FASTAPI APP INIT & CORS SECURITY
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(
    title="Placement Guardian API",
    description="Secure Backend Engine for automated placement workflows",
    version="3.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount a folder called "static" to serve HTML/CSS/JS files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Create a route specifically for the admin panel
@app.get("/admin", include_in_schema=False)
def get_admin_dashboard(admin: str = Depends(verify_admin)): # <-- Bouncer added here
    return FileResponse("static/admin.html")

@app.get("/")
def read_root():
    return {"status": "online", "message": "Secure Server Active."}
# ==========================================
# 5. GOOGLE OAUTH ENDPOINT
# ==========================================
@app.post("/auth/google")
async def google_login(google_token: str):
    # Fix: Use the userinfo endpoint and pass the Access Token in the Authorization header
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {google_token}"}
        )
        
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google Token")
        
    user_data = response.json()
    email = user_data.get("email")
    
    # Enforce domain restriction for the college
    if not email or not email.endswith("@rajagiri.edu.in"):
        raise HTTPException(status_code=403, detail="Only official @rajagiri.edu.in emails are allowed.")
        
    # Issue our encrypted JWT
    access_token = create_access_token(data={"sub": email})
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "email": email,
        "name": user_data.get("name")
    }

# ==========================================
# 6. SECURE PROFILE ENDPOINTS (/me)
# ==========================================

@app.post("/profile/me")
def create_profile(profile: AcademicProfileCreate, session: Session = Depends(get_session), email: str = Depends(verify_token)):
    # Prevent users from creating a profile for an email that isn't theirs
    if profile.personal_email != email:
        raise HTTPException(status_code=403, detail="Email in profile must match logged-in email.")
        
    existing = session.exec(select(AcademicProfile).where(AcademicProfile.personal_email == email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists for this account.")
        
    db_profile = AcademicProfile.model_validate(profile)
    session.add(db_profile)
    session.commit()
    session.refresh(db_profile)
    
    return {"message": "Profile created successfully!", "data": db_profile}


@app.get("/profile/me")
def get_profile(session: Session = Depends(get_session), email: str = Depends(verify_token)):
    profile = session.exec(select(AcademicProfile).where(AcademicProfile.personal_email == email)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Please create one.")
    return profile


@app.put("/profile/me")
def update_profile(profile_update: AcademicProfileUpdate, session: Session = Depends(get_session), email: str = Depends(verify_token)):
    db_profile = session.exec(select(AcademicProfile).where(AcademicProfile.personal_email == email)).first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    update_data = profile_update.model_dump(exclude_unset=True)
    db_profile.sqlmodel_update(update_data)
    
    session.add(db_profile)
    session.commit()
    session.refresh(db_profile)
    return db_profile


@app.delete("/profile/me")
def delete_profile(session: Session = Depends(get_session), email: str = Depends(verify_token)):
    db_profile = session.exec(select(AcademicProfile).where(AcademicProfile.personal_email == email)).first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    session.delete(db_profile)
    session.commit()
    return {"message": "Profile securely deleted."}

# ==========================================
# 7. SECURE RESUME ENDPOINTS (/me/resumes)
# ==========================================

@app.post("/profile/me/resumes/")
def add_resume(resume: ResumeVaultCreate, session: Session = Depends(get_session), email: str = Depends(verify_token)):
    profile = session.exec(select(AcademicProfile).where(AcademicProfile.personal_email == email)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Create a profile first.")
    
    if resume.is_default:
        existing_resumes = session.exec(
            select(ResumeVault).where(ResumeVault.profile_id == profile.id)
        ).all()
        for r in existing_resumes:
            r.is_default = False
            session.add(r)
            
    db_resume = ResumeVault(
        resume_name=resume.resume_name,
        drive_link=resume.drive_link,
        is_default=resume.is_default,
        profile_id=profile.id
    )
    session.add(db_resume)
    session.commit()
    session.refresh(db_resume)
    return db_resume

@app.get("/profile/me/resumes/")
def get_resumes(session: Session = Depends(get_session), email: str = Depends(verify_token)):
    profile = session.exec(select(AcademicProfile).where(AcademicProfile.personal_email == email)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    resumes = session.exec(select(ResumeVault).where(ResumeVault.profile_id == profile.id)).all()
    return resumes

# ==========================================
# 8. BROADCAST ENDPOINTS (The Core Engine)
# ==========================================

# ADMIN: Create a new drive alert
@app.post("/drives/", response_model=PlacementDrive)
def create_drive(drive: PlacementDriveCreate, session: Session = Depends(get_session), admin: str = Depends(verify_admin)):
    db_drive = PlacementDrive.model_validate(drive)
    session.add(db_drive)
    session.commit()
    session.refresh(db_drive)
    return db_drive

# STUDENTS: Fetch only ELIGIBLE active drives
@app.get("/drives/active")
def get_active_drives(session: Session = Depends(get_session), email: str = Depends(verify_token)):
    # 1. Fetch the student's profile securely
    profile = session.exec(select(AcademicProfile).where(AcademicProfile.personal_email == email)).first()
    
    # If they haven't set up a profile yet, return an empty list so they go to the dashboard
    if not profile:
        return []

    # 2. Fetch all active drives
    active_drives = session.exec(select(PlacementDrive).where(PlacementDrive.is_active == True)).all()
    
    # 3. The Smart Filter Engine
    eligible_drives = []
    for drive in active_drives:
        # Check Branch (Allows "ALL" or exact match, ignoring upper/lowercase)
        branch_match = (drive.allowed_branch.upper() == "ALL" or profile.branch.upper() == drive.allowed_branch.upper())
        
        # Check Academic Criteria
        if profile.btech_cgpa >= drive.min_cgpa and profile.active_backlogs <= drive.max_backlogs and branch_match:
            eligible_drives.append(drive)
            
    return eligible_drives

# ADMIN: View all drives (Active and Inactive)
@app.get("/admin/drives/")
def get_all_drives(session: Session = Depends(get_session), admin: str = Depends(verify_admin)):
    drives = session.exec(select(PlacementDrive).order_by(PlacementDrive.id.desc())).all()
    return drives

# ADMIN: Toggle the active status of a drive
@app.put("/admin/drives/{drive_id}/toggle")
def toggle_drive(drive_id: int, session: Session = Depends(get_session), admin: str = Depends(verify_admin)):
    drive = session.get(PlacementDrive, drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
    
    drive.is_active = not drive.is_active
    session.add(drive)
    session.commit()
    return {"message": "Toggled"}

# ==========================================
# 9. TELEMETRY & MANAGEMENT ENDPOINTS
# ==========================================

# STUDENT: Ping when they click "Open Form"
@app.post("/drives/{drive_id}/click")
def record_click(drive_id: int, session: Session = Depends(get_session), email: str = Depends(verify_token)):
    drive = session.get(PlacementDrive, drive_id)
    if drive:
        drive.clicks_count += 1
        session.add(drive)
        session.commit()
    return {"status": "tracked"}

# STUDENT: Ping when they click "Mark as Applied" (Dismiss)
@app.post("/drives/{drive_id}/apply")
def record_apply(drive_id: int, session: Session = Depends(get_session), email: str = Depends(verify_token)):
    drive = session.get(PlacementDrive, drive_id)
    if drive:
        drive.applied_count += 1
        session.add(drive)
        session.commit()
    return {"status": "tracked"}

# ADMIN: Hard Delete a drive permanently
@app.delete("/admin/drives/{drive_id}")
def delete_drive(drive_id: int, session: Session = Depends(get_session), admin: str = Depends(verify_admin)):
    drive = session.get(PlacementDrive, drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
    session.delete(drive)
    session.commit()
    return {"status": "deleted"}