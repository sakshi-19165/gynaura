import json
import os
import re
import secrets
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

import httpx
from fastapi import FastAPI, HTTPException, Header, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# Threading locks
DATA_LOCK = threading.RLock()
OTP_LOCK = threading.Lock()

# Configuration
MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "gynaura")
ADMIN_KEY = os.getenv("ADMIN_KEY", "gyncare-admin-2026")
ADMIN_EMAILS = [e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()]
DATA_FILE = Path(__file__).with_name("data.json")

# In-memory OTP storage & rate limiting
# otp_store: {(role, local_phone): {"code": otp_str, "expires_at": float, "attempts": int}}
otp_store: Dict[Tuple[str, str], Dict[str, Any]] = {}
# otp_rate_limit: {local_phone: [timestamp1, timestamp2, ...]}
otp_rate_limit: Dict[str, List[float]] = {}

# MongoDB Client state
_mongo_client: Optional[Any] = None
_mongo_db: Optional[Any] = None
_mongo_connected: bool = False


def get_mongo_db():
    global _mongo_client, _mongo_db, _mongo_connected
    uri = os.getenv("MONGODB_URI")
    db_name = os.getenv("MONGODB_DB_NAME", "gynaura")
    if not uri or MongoClient is None:
        _mongo_connected = False
        return None
    if _mongo_client is not None and _mongo_connected and _mongo_db is not None:
        return _mongo_db
    try:
        _mongo_client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        _mongo_client.admin.command("ping")
        _mongo_db = _mongo_client[db_name]
        _mongo_connected = True
        return _mongo_db
    except Exception as e:
        print(f"[MongoDB] Connection error: {e}. Falling back to local data.json.")
        _mongo_connected = False
        return None


def is_mongo_active() -> bool:
    global _mongo_connected
    uri = os.getenv("MONGODB_URI")
    if not uri or MongoClient is None:
        return False
    if _mongo_connected and _mongo_db is not None:
        return True
    db = get_mongo_db()
    return db is not None and _mongo_connected


def is_twilio_configured() -> bool:
    return bool(
        os.getenv("TWILIO_ACCOUNT_SID")
        and os.getenv("TWILIO_AUTH_TOKEN")
        and os.getenv("TWILIO_FROM")
    )


# App initialization
app = FastAPI(title="GynAura API")

_cors_env = os.getenv("CORS_ORIGINS")
_cors_origins = [o.strip() for o in _cors_env.split(",") if o.strip()] if _cors_env else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# Data Seed
def get_default_data() -> Dict[str, Any]:
    doctors = {
        "d-sarah": {
            "id": "d-sarah",
            "name": "Dr. Sarah Jenkins, MD, FACOG",
            "phone": "9999900000",
            "email": "",
            "specialty": "Obstetrics & High-Risk Gynecology",
            "clinics": ["Vijay Nagar, Indore", "Super Corridor, Indore"],
            "nmc_reg": "MP-18492",
            "status": "active",
            "experience": "15+ years",
        }
    }

    patients = {
        "p-priya": {
            "id": "p-priya",
            "doctor_id": "d-sarah",
            "name": "Priya Sharma",
            "phone": "9876543210",
            "email": "priya.sharma@gmail.com",
            "age": 28,
            "tag": "Antenatal",
            "high_priority": False,
            "summary": "Week 24 · Trimester II · Low Risk",
            "adherence": 94,
            "cycle": {"last_period": "2026-11-01", "cycle_length": 28},
            "care_plans": [
                {
                    "id": "cp-1",
                    "title": "75g Oral Glucose Tolerance Test (GTT)",
                    "category": "Lab",
                    "frequency": "Once this week",
                    "notes": "Fasting sample at Vijay Nagar lab",
                    "assigned_by": "Dr. Sarah Jenkins",
                    "created_at": "2026-11-12",
                },
                {
                    "id": "cp-2",
                    "title": "Folic Acid 5mg + Iron",
                    "category": "Medication",
                    "frequency": "Daily after breakfast",
                    "notes": "Continue through Trimester II",
                    "assigned_by": "Dr. Sarah Jenkins",
                    "created_at": "2026-11-10",
                },
            ],
            "reminders": [
                {"id": "rem-1", "name": "Folic Acid 5mg", "time": "9:00 AM · After breakfast", "done": True},
                {"id": "rem-2", "name": "Iron + Vitamin C", "time": "2:00 PM · After lunch", "done": False},
                {"id": "rem-3", "name": "Gynec Follow-Up · Vijay Nagar", "time": "Tue 10:30 AM", "done": False},
            ],
            "reports": [
                {
                    "id": "rep-1",
                    "title": "Pelvic & TIFFA Anomaly Scan",
                    "date": "2026-11-05",
                    "status": "Normal",
                    "summary": "Normal fetal growth parameters and amniotic fluid index.",
                    "plain_explanation": "Your baby's anatomy and growth measurements are right on track for Week 24.",
                },
                {
                    "id": "rep-2",
                    "title": "Thyroid & CBC Panel",
                    "date": "2026-10-28",
                    "status": "Normal",
                    "summary": "TSH 2.4 mIU/L · Hb 12.1 g/dL.",
                    "plain_explanation": "Thyroid and hemoglobin levels are healthy and within target antenatal range.",
                },
            ],
            "mood_logs": [{"id": "m-1", "mood": "Calm", "note": "Feeling rested after morning walk", "timestamp": "2026-11-19 08:30"}],
            "symptom_logs": [{"id": "s-1", "flow": "None", "pain": 2, "symptoms": ["Mild fatigue"], "timestamp": "2026-11-19 08:35"}],
            "pcos_habits": ["Protein-first breakfast", "30 min brisk walk"],
            "pregnancy_checks": [],
        },
        "p-neha": {
            "id": "p-neha",
            "doctor_id": "d-sarah",
            "name": "Neha Verma",
            "phone": "9826011122",
            "age": 23,
            "tag": "PCOS",
            "high_priority": False,
            "summary": "PCOS Metabolic Protocol · Cycle Day 16",
            "adherence": 86,
            "cycle": {"last_period": "2026-11-03", "cycle_length": 34},
            "care_plans": [
                {"id": "cp-neha-1", "title": "Inositol Supplement", "category": "Medication", "frequency": "Twice daily", "notes": "With meals", "assigned_by": "Dr. Sarah Jenkins", "created_at": "2026-11-05"}
            ],
            "reminders": [
                {"id": "rem-neha-1", "name": "Inositol Morning Dose", "time": "8:30 AM", "done": True}
            ],
            "reports": [
                {"id": "rep-neha-1", "title": "Pelvic USG & Ovary Scan", "date": "2026-10-15", "status": "Normal", "summary": "PCO morphology noted.", "plain_explanation": "Consistent with mild PCOS pattern. Managed well with lifestyle and diet."}
            ],
            "mood_logs": [],
            "symptom_logs": [],
            "pcos_habits": ["Protein-first breakfast", "30 min brisk walk", "2.5L hydration"],
            "pregnancy_checks": [],
        },
        "p-ritu": {
            "id": "p-ritu",
            "doctor_id": "d-sarah",
            "name": "Ritu Jain",
            "phone": "9826033344",
            "age": 31,
            "tag": "Fertility",
            "high_priority": False,
            "summary": "Preconception & Follicular Tracking",
            "adherence": 91,
            "cycle": {"last_period": "2026-11-07", "cycle_length": 28},
            "care_plans": [],
            "reminders": [],
            "reports": [],
            "mood_logs": [],
            "symptom_logs": [],
            "pcos_habits": ["8h sleep"],
            "pregnancy_checks": [],
        },
        "p-ananya": {
            "id": "p-ananya",
            "doctor_id": "d-sarah",
            "name": "Ananya Patel",
            "phone": "9826055566",
            "age": 30,
            "tag": "High-Risk",
            "high_priority": True,
            "summary": "Week 29 · Gestational Diabetes Monitoring",
            "adherence": 78,
            "cycle": {"last_period": "2026-04-29", "cycle_length": 28},
            "care_plans": [],
            "reminders": [],
            "reports": [
                {"id": "rep-ana-1", "title": "Oral Glucose Tolerance Test", "date": "2026-11-15", "status": "Needs Review", "summary": "Elevated post-prandial blood sugar 165 mg/dL.", "plain_explanation": "Requires dietary adjustment and close blood glucose monitoring."}
            ],
            "mood_logs": [],
            "symptom_logs": [],
            "pcos_habits": [],
            "pregnancy_checks": [],
        },
    }

    appointments = [
        {
            "id": "apt-1",
            "doctor_id": "d-sarah",
            "patient_id": "p-priya",
            "name": "Priya Sharma",
            "phone": "9876543210",
            "service": "Antenatal Trimester II Checkup",
            "date": "2026-11-22 10:30",
            "mode": "In-Clinic",
            "status": "Confirmed",
            "notes": "Bring GTT lab report",
        },
        {
            "id": "apt-2",
            "doctor_id": "d-sarah",
            "patient_id": "p-neha",
            "name": "Neha Verma",
            "phone": "9826011122",
            "service": "PCOS Consultation & Diet Review",
            "date": "2026-11-22 11:30",
            "mode": "In-Clinic",
            "status": "Pending",
            "notes": "First visit for metabolic protocol",
        },
        {
            "id": "apt-3",
            "doctor_id": "d-sarah",
            "patient_id": "p-ananya",
            "name": "Ananya Patel",
            "phone": "9826055566",
            "service": "High-Risk Gestational Diabetes Review",
            "date": "2026-11-23 12:00",
            "mode": "Video",
            "status": "Confirmed",
            "notes": "Review recent GTT values",
        },
    ]

    clinics = []

    return {
        "doctors": doctors,
        "patients": patients,
        "appointments": appointments,
        "clinics": clinics,
        "sessions": {},
    }


def _migrate_data(data: Dict[str, Any]) -> bool:
    """Auto-migrate legacy single-doctor schema to multi-doctor schema."""
    changed = False
    if "sessions" not in data or not isinstance(data.get("sessions"), dict):
        data["sessions"] = {}
        changed = True
    if "clinics" not in data or not isinstance(data.get("clinics"), list):
        data["clinics"] = []
        changed = True

    if "doctors" not in data or not isinstance(data.get("doctors"), dict):
        if "doctor" in data and isinstance(data["doctor"], dict):
            legacy_doc = data.pop("doctor")
            doc_id = legacy_doc.get("id", "d-sarah")
            data["doctors"] = {
                doc_id: {
                    "status": "active",
                    "nmc_reg": "MP-18492",
                    **legacy_doc,
                }
            }
        else:
            data["doctors"] = get_default_data()["doctors"]
        changed = True
    elif "doctor" in data:
        data.pop("doctor", None)
        changed = True

    for doc in data.get("doctors", {}).values():
        if isinstance(doc, dict):
            if "status" not in doc:
                doc["status"] = "active"
                changed = True
            if "nmc_reg" not in doc:
                doc["nmc_reg"] = "MP-18492" if doc.get("id") == "d-sarah" else ""
                changed = True

    for p in data.get("patients", {}).values():
        if isinstance(p, dict) and not p.get("doctor_id"):
            p["doctor_id"] = "d-sarah"
            changed = True

    for a in data.get("appointments", []):
        if isinstance(a, dict) and not a.get("doctor_id"):
            a["doctor_id"] = "d-sarah"
            changed = True

    for c in data.get("clinics", []):
        if isinstance(c, dict):
            if not c.get("id"):
                c["id"] = f"req-{secrets.token_hex(4)}"
                changed = True
            if not c.get("status"):
                c["status"] = "pending"
                changed = True

    return changed


# Persistence helpers
def _load_data_internal() -> Dict[str, Any]:
    db = get_mongo_db()
    if db is not None:
        try:
            doc = db["app_state"].find_one({"_id": "primary"})
            if doc is None:
                default_data = get_default_data()
                db["app_state"].replace_one(
                    {"_id": "primary"},
                    {"_id": "primary", **default_data},
                    upsert=True,
                )
                return default_data
            doc.pop("_id", None)
            if _migrate_data(doc):
                _save_data_internal(doc)
            return doc
        except Exception as e:
            print(f"[MongoDB] Read error: {e}. Falling back to local data.json.")

    if not DATA_FILE.exists():
        data = get_default_data()
        _save_data_internal(data)
        return data
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if _migrate_data(data):
                _save_data_internal(data)
            return data
    except Exception:
        data = get_default_data()
        _save_data_internal(data)
        return data


def _save_data_internal(data: Dict[str, Any]) -> None:
    db = get_mongo_db()
    if db is not None:
        try:
            payload = {k: v for k, v in data.items() if k != "_id"}
            db["app_state"].replace_one(
                {"_id": "primary"},
                {"_id": "primary", **payload},
                upsert=True,
            )
            return
        except Exception as e:
            print(f"[MongoDB] Write error: {e}. Writing to local data.json.")

    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def load_data() -> Dict[str, Any]:
    with DATA_LOCK:
        return _load_data_internal()


def save_data(data: Dict[str, Any]) -> None:
    with DATA_LOCK:
        _save_data_internal(data)


# Phone normalization
def normalize_phone(raw: str) -> Tuple[str, str]:
    """Normalize input phone string into (local_10digit, e164).
    Rejects invalid inputs (<10 digits) with HTTP 400.
    """
    if not raw or not isinstance(raw, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enter a valid 10-digit mobile number",
        )
    cleaned = re.sub(r"[\s\-\(\)\.]", "", raw.strip())
    digits_only = re.sub(r"\D", "", cleaned)

    if len(digits_only) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enter a valid 10-digit mobile number",
        )

    # 10 digits exactly
    if re.fullmatch(r"\d{10}", cleaned):
        return cleaned, f"+91{cleaned}"

    # +91 with 10 digits
    if re.fullmatch(r"\+91\d{10}", cleaned):
        last_10 = cleaned[-10:]
        return last_10, f"+91{last_10}"

    # 91 with 10 digits
    if re.fullmatch(r"91\d{10}", cleaned):
        last_10 = cleaned[-10:]
        return last_10, f"+91{last_10}"

    # International starting with +
    if cleaned.startswith("+"):
        last_10 = digits_only[-10:]
        return last_10, f"+{digits_only}"

    # General fallback with at least 10 digits
    last_10 = digits_only[-10:]
    return last_10, f"+91{last_10}"


def normalize_phone_safe(phone: Optional[str]) -> str:
    if not phone:
        return ""
    try:
        norm, _ = normalize_phone(phone)
        return norm
    except Exception:
        digits = re.sub(r"\D", "", str(phone))
        return digits[-10:] if len(digits) >= 10 else digits


def find_patient_by_phone_or_id(patients: dict, patient_id: Optional[str] = None, phone: Optional[str] = None) -> Optional[dict]:
    if patient_id and patient_id in patients:
        return patients[patient_id]
    if phone:
        norm_phone = normalize_phone_safe(phone)
        for p in patients.values():
            if normalize_phone_safe(p.get("phone")) == norm_phone:
                return p
    # Default fallback
    return patients.get("p-priya")


def create_patient_record(
    patients: dict,
    name: str,
    phone: str,
    age: int = 26,
    tag: str = "General",
    summary: str = "New Indore patient",
    high_priority: bool = False,
    email: str = "",
    picture: str = "",
    doctor_id: str = "d-sarah",
) -> dict:
    norm_phone = normalize_phone_safe(phone) if phone else ""
    pid = f"p-{secrets.token_hex(4)}"
    new_patient = {
        "id": pid,
        "doctor_id": doctor_id or "d-sarah",
        "name": name,
        "phone": norm_phone,
        "email": email,
        "picture": picture,
        "age": age,
        "tag": tag,
        "high_priority": high_priority,
        "summary": summary,
        "adherence": 100,
        "cycle": {"last_period": datetime.now().strftime("%Y-%m-%d"), "cycle_length": 28},
        "care_plans": [],
        "reminders": [],
        "reports": [],
        "mood_logs": [],
        "symptom_logs": [],
        "pcos_habits": [],
        "pregnancy_checks": [],
    }
    patients[pid] = new_patient
    return new_patient


def extract_bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[len("Bearer "):].strip()
    return token or None


def _get_session_from_header(
    authorization: Optional[str], data: Dict[str, Any]
) -> Optional[Tuple[str, Dict[str, Any]]]:
    token = extract_bearer_token(authorization)
    if not token:
        return None
    session = data.get("sessions", {}).get(token)
    if not session:
        return None
    expires_at = session.get("expires_at")
    if expires_at and time.time() > expires_at:
        del data["sessions"][token]
        save_data(data)
        return None
    return token, session


def require_admin(
    authorization: Optional[str], data: Dict[str, Any]
) -> Tuple[str, Dict[str, Any]]:
    res = _get_session_from_header(authorization, data)
    if not res:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing, invalid, or expired admin session",
        )
    token, session = res
    if session.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return token, session


def _resolve_doctor(authorization: Optional[str], data: Dict[str, Any]) -> Dict[str, Any]:
    doctors = data.get("doctors", {})
    res = _get_session_from_header(authorization, data)
    if res:
        _, session = res
        if session.get("role") == "doctor":
            doc = doctors.get(session.get("user_id"))
            if doc:
                return doc
    if "d-sarah" in doctors:
        return doctors["d-sarah"]
    if doctors:
        return next(iter(doctors.values()))
    raise HTTPException(status_code=404, detail="Doctor not found")


# Pydantic models
class OTPRequest(BaseModel):
    phone: str
    role: str = "patient"


class OTPVerify(BaseModel):
    phone: str
    otp: str
    role: str = "patient"
    name: Optional[str] = None
    age: Optional[int] = None
    tag: Optional[str] = "General"


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    age: Optional[int] = None
    tag: Optional[str] = None
    specialty: Optional[str] = None
    clinics: Optional[List[str]] = None


class GoogleAuthRequest(BaseModel):
    id_token: str
    role: str = "patient"


class AdminLoginRequest(BaseModel):
    admin_key: str


class AdminDoctorCreate(BaseModel):
    name: str
    phone: str
    email: str = ""
    specialty: str = "Obstetrics & Gynecology"
    clinics: List[str] = Field(default_factory=lambda: ["Indore"])
    nmc_reg: str = ""


class AdminDoctorUpdate(BaseModel):
    status: Optional[str] = None
    name: Optional[str] = None
    specialty: Optional[str] = None
    clinics: Optional[List[str]] = None
    nmc_reg: Optional[str] = None


class PatientRegister(BaseModel):
    name: str
    phone: str
    age: int = 26
    tag: str = "General"


class DoctorPatientCreate(BaseModel):
    name: str
    phone: str
    age: int = 28
    tag: str = "Antenatal"
    summary: str = "New Indore patient"
    high_priority: bool = False


class CycleUpdate(BaseModel):
    patient_id: str = "p-priya"
    last_period: str
    cycle_length: int


class MoodLog(BaseModel):
    patient_id: str = "p-priya"
    mood: str
    note: str = ""


class SymptomLog(BaseModel):
    patient_id: str = "p-priya"
    flow: str
    pain: int
    symptoms: List[str]


class ReminderToggle(BaseModel):
    patient_id: str = "p-priya"
    reminder_id: str


class ReminderCreate(BaseModel):
    patient_id: str = "p-priya"
    name: str
    time: str


class PCOSHabitsUpdate(BaseModel):
    patient_id: str = "p-priya"
    habits: List[str]


class PregnancyCheck(BaseModel):
    patient_id: str = "p-priya"
    signs: List[str]


class CarePlanCreate(BaseModel):
    title: str
    category: str = "Medication"
    frequency: str = "Daily"
    notes: str = ""


class ReportCreate(BaseModel):
    title: str
    date: Optional[str] = None
    status: str = "Normal"
    summary: str
    plain_explanation: str = ""


class AppointmentCreate(BaseModel):
    name: str
    phone: str
    service: str
    date: str
    mode: str = "In-Clinic"
    notes: str = ""
    patient_id: Optional[str] = None


class AppointmentStatusUpdate(BaseModel):
    status: str


class ClinicOnboard(BaseModel):
    doctor: str
    clinicName: str
    city: str = "Indore"
    phone: str


# Endpoints
@app.get("/api/health")
def health_check():
    mongo_active = is_mongo_active()
    twilio_active = is_twilio_configured()
    google_oauth = bool(os.getenv("GOOGLE_CLIENT_ID"))
    return {
        "status": "ok",
        "service": "GynAura API",
        "storage": "mongodb" if mongo_active else "json-local",
        "mongo_connected": mongo_active,
        "sms_mode": "twilio" if twilio_active else "demo",
        "google_oauth": google_oauth,
    }


@app.get("/api/auth/config")
def auth_config():
    google_client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    return {
        "google_client_id": google_client_id,
        "google_enabled": bool(google_client_id),
        "sms_mode": "twilio" if is_twilio_configured() else "demo",
    }


@app.post("/api/auth/google")
def google_auth(payload: GoogleAuthRequest):
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not google_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth not configured (set GOOGLE_CLIENT_ID)",
        )

    try:
        resp = httpx.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": payload.id_token},
            timeout=8.0,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Unable to reach Google OAuth verification: {exc}",
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google token",
        )

    info = resp.json()
    if info.get("aud") != google_client_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google token",
        )

    if str(info.get("email_verified", "")).lower() != "true":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google token",
        )

    try:
        exp_time = int(info.get("exp", 0))
    except (ValueError, TypeError):
        exp_time = 0

    if exp_time <= int(time.time()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google token",
        )

    email = info.get("email", "").strip().lower()
    name = info.get("name") or (email.split("@")[0] if "@" in email else "GynAura Member")
    picture = info.get("picture", "")

    data = load_data()

    if payload.role == "admin":
        admin_emails_env = os.getenv("ADMIN_EMAILS", "")
        allowed_admins = (
            [e.strip().lower() for e in admin_emails_env.split(",") if e.strip()]
            if admin_emails_env
            else ADMIN_EMAILS
        )
        if not allowed_admins:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ADMIN_EMAILS not configured",
            )
        if email not in allowed_admins:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This Google account is not authorized as an Admin",
            )
        admin_user = {
            "id": "admin-1",
            "name": name or "GynAura Admin",
            "phone": "",
            "email": email,
        }
        if picture:
            admin_user["picture"] = picture
        token = _issue_session(data, "admin", admin_user, "")
        return {"ok": True, "token": token, "role": "admin", "user": admin_user}

    if payload.role == "doctor":
        doctors = data.get("doctors", {})
        matched_doc = next(
            (d for d in doctors.values() if d.get("email", "").strip().lower() == email),
            None,
        )
        doctor_emails_env = os.getenv("DOCTOR_EMAILS", "")
        allowed_doc_emails = [
            e.strip().lower() for e in doctor_emails_env.split(",") if e.strip()
        ]
        if not matched_doc:
            if email in allowed_doc_emails:
                sarah = doctors.get("d-sarah")
                if sarah and (not sarah.get("email") or len(allowed_doc_emails) == 1):
                    sarah["email"] = email
                    matched_doc = sarah
                else:
                    doc_id = f"d-{secrets.token_hex(4)}"
                    matched_doc = {
                        "id": doc_id,
                        "name": name,
                        "phone": "",
                        "email": email,
                        "specialty": "Obstetrics & Gynecology",
                        "clinics": ["Indore"],
                        "nmc_reg": "",
                        "status": "active",
                        "experience": "",
                    }
                    doctors[doc_id] = matched_doc
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Doctor account not enrolled. Contact GynAura Admin.",
                )

        if matched_doc.get("status", "active") != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Doctor account not enrolled or suspended. Contact GynAura Admin.",
            )

        if picture:
            matched_doc["picture"] = picture
        token = _issue_session(data, "doctor", matched_doc, matched_doc.get("phone", ""))
        return {"ok": True, "token": token, "role": "doctor", "user": matched_doc}

    # Patient flow
    patients = data["patients"]
    existing = next((p for p in patients.values() if p.get("email", "").strip().lower() == email), None)
    if existing:
        user = existing
        if picture and not user.get("picture"):
            user["picture"] = picture
    else:
        pid = f"p-{secrets.token_hex(4)}"
        user = {
            "id": pid,
            "doctor_id": "d-sarah",
            "name": name,
            "email": email,
            "picture": picture,
            "phone": "",
            "age": 26,
            "tag": "General",
            "high_priority": False,
            "summary": "GynAura Member · Indore",
            "adherence": 100,
            "cycle": {"last_period": datetime.now().strftime("%Y-%m-%d"), "cycle_length": 28},
            "care_plans": [],
            "reminders": [],
            "reports": [],
            "mood_logs": [],
            "symptom_logs": [],
            "pcos_habits": [],
            "pregnancy_checks": [],
        }
        patients[pid] = user

    token = _issue_session(data, "patient", user, user.get("phone", ""))
    return {"ok": True, "token": token, "role": "patient", "user": user}


@app.post("/api/auth/admin-login")
def admin_login(payload: AdminLoginRequest):
    expected_key = os.getenv("ADMIN_KEY") or ADMIN_KEY
    if payload.admin_key != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin key",
        )
    data = load_data()
    admin_user = {"id": "admin-1", "name": "GynAura Admin", "phone": ""}
    token = _issue_session(data, "admin", admin_user, "")
    return {
        "ok": True,
        "token": token,
        "role": "admin",
        "user": {"id": "admin-1", "name": "GynAura Admin"},
    }


@app.post("/api/auth/request-otp")
def request_otp(payload: OTPRequest):
    local_phone, e164 = normalize_phone(payload.phone)
    role = payload.role
    now = time.time()

    # Rate limiting: max 5 requests per 10 minutes
    with OTP_LOCK:
        history = otp_rate_limit.get(local_phone, [])
        recent = [t for t in history if now - t < 600]
        if len(recent) >= 5:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many OTP requests. Please wait a few minutes.",
            )
        recent.append(now)
        otp_rate_limit[local_phone] = recent

        otp = f"{secrets.randbelow(900000) + 100000}"
        otp_store[(role, local_phone)] = {
            "code": otp,
            "expires_at": now + 300,
            "attempts": 0,
        }

    twilio_configured = is_twilio_configured()
    if twilio_configured:
        twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
        twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
        twilio_from = os.getenv("TWILIO_FROM")
        try:
            resp = httpx.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/Messages.json",
                auth=(twilio_sid, twilio_token),
                data={
                    "From": twilio_from,
                    "To": e164,
                    "Body": f"Your GynAura verification code is {otp}. It expires in 5 minutes.",
                },
                timeout=10.0,
            )
            if resp.status_code >= 400:
                raise HTTPException(status_code=502, detail="Failed to send OTP SMS via Twilio")
            return {"ok": True, "phone": local_phone, "e164": e164, "role": role, "sms_sent": True}
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Failed to send OTP SMS via Twilio: {exc}")

    return {
        "ok": True,
        "phone": local_phone,
        "e164": e164,
        "role": role,
        "sms_sent": False,
        "demo_otp": otp,
        "mode": "demo",
    }


def _issue_session(data: Dict[str, Any], role: str, user: Dict[str, Any], phone: str) -> str:
    token = secrets.token_urlsafe(24)
    data.setdefault("sessions", {})[token] = {
        "role": role,
        "user_id": user["id"],
        "phone": phone,
        "name": user["name"],
        "created_at": time.time(),
        "expires_at": time.time() + 7 * 86400,
    }
    save_data(data)
    return token


@app.post("/api/auth/verify-otp")
def verify_otp(payload: OTPVerify):
    local_phone, _ = normalize_phone(payload.phone)
    otp = (payload.otp or "").strip()
    role = payload.role
    twilio_configured = is_twilio_configured()

    with OTP_LOCK:
        key = (role, local_phone)
        entry = otp_store.get(key)
        if entry:
            if entry.get("attempts", 0) >= 5:
                otp_store.pop(key, None)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many failed attempts. Request a new OTP.",
                )

            if time.time() > entry["expires_at"]:
                otp_store.pop(key, None)
                raise HTTPException(status_code=400, detail="OTP expired")

            is_code_valid = (otp == entry["code"])
            is_demo_bypass = (not twilio_configured and otp == "123456")

            if not (is_code_valid or is_demo_bypass):
                entry["attempts"] = entry.get("attempts", 0) + 1
                if entry["attempts"] >= 5:
                    otp_store.pop(key, None)
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Too many failed attempts. Request a new OTP.",
                    )
                raise HTTPException(status_code=400, detail="Invalid OTP")

            # Successfully verified
            otp_store.pop(key, None)
        else:
            is_demo_bypass = (not twilio_configured and otp == "123456")
            if not is_demo_bypass:
                raise HTTPException(status_code=400, detail="Invalid OTP")

    data = load_data()
    if role == "doctor":
        doctors = data.get("doctors", {})
        user = next(
            (
                d
                for d in doctors.values()
                if normalize_phone_safe(d.get("phone")) == local_phone
            ),
            None,
        )
        if not user or user.get("status", "active") != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Doctor account not enrolled or suspended. Contact GynAura Admin.",
            )
    else:
        patients = data["patients"]
        existing = next((p for p in patients.values() if normalize_phone_safe(p.get("phone")) == local_phone), None)
        if existing:
            user = existing
        elif payload.name:
            user = create_patient_record(
                patients,
                name=payload.name,
                phone=local_phone,
                age=payload.age if payload.age is not None else 26,
                tag=payload.tag or "General",
            )
        else:
            user = find_patient_by_phone_or_id(patients, phone=local_phone)

    token = _issue_session(data, role, user, local_phone)
    return {
        "ok": True,
        "token": token,
        "role": role,
        "user": user,
    }


@app.post("/api/auth/register")
def register_patient(payload: PatientRegister):
    local_phone, _ = normalize_phone(payload.phone)
    data = load_data()
    patients = data["patients"]
    existing = next((p for p in patients.values() if normalize_phone_safe(p.get("phone")) == local_phone), None)
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    new_patient = create_patient_record(
        patients,
        name=payload.name,
        phone=local_phone,
        age=payload.age,
        tag=payload.tag,
    )
    token = _issue_session(data, "patient", new_patient, local_phone)
    return {
        "ok": True,
        "token": token,
        "role": "patient",
        "user": new_patient,
    }


@app.get("/api/auth/me")
def get_auth_me(authorization: Optional[str] = Header(default=None)):
    token = extract_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    data = load_data()
    res = _get_session_from_header(authorization, data)
    if not res:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    _, session = res
    role = session["role"]
    if role == "admin":
        user = {
            "id": session.get("user_id", "admin-1"),
            "name": session.get("name", "GynAura Admin"),
        }
    elif role == "doctor":
        user = data.get("doctors", {}).get(session.get("user_id"))
        if not user:
            raise HTTPException(status_code=401, detail="Doctor not found")
        if user.get("status", "active") != "active":
            raise HTTPException(status_code=403, detail="Doctor account suspended")
    else:
        user = data.get("patients", {}).get(session.get("user_id"))
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

    return {"authenticated": True, "role": role, "user": user}


@app.patch("/api/auth/profile")
def update_auth_profile(
    payload: ProfileUpdate,
    authorization: Optional[str] = Header(default=None),
):
    token = extract_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    with DATA_LOCK:
        data = _load_data_internal()
        res = _get_session_from_header(authorization, data)
        if not res:
            raise HTTPException(status_code=401, detail="Invalid or expired session")
        _, session = res

        role = session.get("role")
        if role == "doctor":
            doctor = data.get("doctors", {}).get(session.get("user_id"))
            if not doctor:
                raise HTTPException(status_code=404, detail="Doctor not found")
            if payload.name is not None and payload.name.strip():
                doctor["name"] = payload.name.strip()
                session["name"] = doctor["name"]
            if payload.phone is not None and payload.phone.strip():
                local_phone, _ = normalize_phone(payload.phone.strip())
                doctor["phone"] = local_phone
                session["phone"] = local_phone
            if payload.specialty is not None and payload.specialty.strip():
                doctor["specialty"] = payload.specialty.strip()
            if payload.clinics is not None:
                doctor["clinics"] = [
                    c.strip() for c in payload.clinics if isinstance(c, str) and c.strip()
                ]
            _save_data_internal(data)
            return {"ok": True, "role": "doctor", "user": doctor}

        if role == "patient":
            patient = data["patients"].get(session["user_id"])
            if not patient:
                raise HTTPException(status_code=404, detail="Patient not found")
            if payload.name is not None and payload.name.strip():
                patient["name"] = payload.name.strip()
                session["name"] = patient["name"]
            if payload.phone is not None and payload.phone.strip():
                local_phone, _ = normalize_phone(payload.phone.strip())
                patient["phone"] = local_phone
                session["phone"] = local_phone
            if payload.age is not None:
                patient["age"] = payload.age
            if payload.tag is not None and payload.tag.strip():
                patient["tag"] = payload.tag.strip()
            _save_data_internal(data)
            return {"ok": True, "role": "patient", "user": patient}

        raise HTTPException(status_code=401, detail="Invalid session role")


@app.post("/api/auth/logout")
def logout(authorization: Optional[str] = Header(default=None)):
    token = extract_bearer_token(authorization)
    if token:
        data = load_data()
        if token in data.get("sessions", {}):
            del data["sessions"][token]
            save_data(data)
    return {"ok": True}


@app.get("/api/patient/profile")
def get_patient_profile(patient_id: Optional[str] = None, phone: Optional[str] = None):
    data = load_data()
    patients = data["patients"]
    norm_phone = None
    if phone:
        try:
            norm_phone, _ = normalize_phone(phone)
        except Exception:
            norm_phone = phone

    patient = find_patient_by_phone_or_id(patients, patient_id=patient_id, phone=norm_phone)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    p_id = patient["id"]
    p_phone = patient["phone"]

    # Filter appointments matching patient_id or normalized phone
    patient_appointments = [
        apt for apt in data["appointments"]
        if apt.get("patient_id") == p_id or normalize_phone_safe(apt.get("phone")) == normalize_phone_safe(p_phone)
    ]

    disclaimer = (
        "AI health guidance and pregnancy-related features provide educational support only "
        "and do not replace medical diagnosis, clinical consultation, or pregnancy testing."
    )

    return {
        **patient,
        "appointments": patient_appointments,
        "disclaimer": disclaimer,
    }


@app.post("/api/patient/cycle")
def update_cycle(payload: CycleUpdate):
    data = load_data()
    patients = data["patients"]
    patient = find_patient_by_phone_or_id(patients, patient_id=payload.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient["cycle"] = {
        "last_period": payload.last_period,
        "cycle_length": payload.cycle_length,
    }
    save_data(data)
    return {"ok": True, "cycle": patient["cycle"]}


@app.post("/api/patient/mood")
def add_mood(payload: MoodLog):
    data = load_data()
    patients = data["patients"]
    patient = find_patient_by_phone_or_id(patients, patient_id=payload.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    new_mood = {
        "id": f"m-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "mood": payload.mood,
        "note": payload.note,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }
    patient["mood_logs"].insert(0, new_mood)
    save_data(data)
    return {"ok": True, "mood_logs": patient["mood_logs"]}


@app.post("/api/patient/symptoms")
def add_symptoms(payload: SymptomLog):
    data = load_data()
    patients = data["patients"]
    patient = find_patient_by_phone_or_id(patients, patient_id=payload.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    new_sym = {
        "id": f"s-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "flow": payload.flow,
        "pain": payload.pain,
        "symptoms": payload.symptoms,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }
    patient["symptom_logs"].insert(0, new_sym)
    save_data(data)
    return {"ok": True, "symptom_logs": patient["symptom_logs"]}


@app.post("/api/patient/reminders/toggle")
def toggle_reminder(payload: ReminderToggle):
    data = load_data()
    patients = data["patients"]
    patient = find_patient_by_phone_or_id(patients, patient_id=payload.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    for rem in patient["reminders"]:
        if rem["id"] == payload.reminder_id:
            rem["done"] = not rem.get("done", False)
            break

    save_data(data)
    return {"ok": True, "reminders": patient["reminders"]}


@app.post("/api/patient/reminders")
def create_reminder(payload: ReminderCreate):
    data = load_data()
    patients = data["patients"]
    patient = find_patient_by_phone_or_id(patients, patient_id=payload.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    new_rem = {
        "id": f"rem-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "name": payload.name,
        "time": payload.time,
        "done": False,
    }
    patient["reminders"].append(new_rem)
    save_data(data)
    return {"ok": True, "reminders": patient["reminders"]}


@app.delete("/api/patient/reminders/{reminder_id}")
def delete_patient_reminder(reminder_id: str, patient_id: str = "p-priya"):
    data = load_data()
    patients = data["patients"]
    if patient_id not in patients:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient = patients[patient_id]
    before = len(patient["reminders"])
    patient["reminders"] = [r for r in patient["reminders"] if r.get("id") != reminder_id]
    if len(patient["reminders"]) == before:
        raise HTTPException(status_code=404, detail="Reminder not found")

    save_data(data)
    return {"ok": True, "reminders": patient["reminders"]}


@app.post("/api/patient/pcos")
def update_pcos(payload: PCOSHabitsUpdate):
    data = load_data()
    patients = data["patients"]
    patient = find_patient_by_phone_or_id(patients, patient_id=payload.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient["pcos_habits"] = payload.habits
    save_data(data)
    return {"ok": True, "pcos_habits": patient["pcos_habits"]}


@app.post("/api/patient/pregnancy-check")
def pregnancy_check(payload: PregnancyCheck):
    data = load_data()
    patients = data["patients"]
    patient = find_patient_by_phone_or_id(patients, patient_id=payload.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    signs_count = len(payload.signs)
    if signs_count >= 3:
        recommendation = "Multiple early signs reported. Consider taking a home urine pregnancy test or consulting Dr. Sarah Jenkins for a beta-hCG blood test."
    elif signs_count > 0:
        recommendation = "Some mild signs noted. Monitor symptoms for a few days and test if menstruation is delayed."
    else:
        recommendation = "No primary pregnancy signs checked. Continue routine cycle tracking."

    disclaimer = (
        "Educational support only — this does not replace medical diagnosis or pregnancy testing. "
        "Take a home urine hCG test 7 days after a missed period or consult a gynecologist for a beta-hCG blood test."
    )

    check_entry = {
        "id": f"chk-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "signs": payload.signs,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }
    patient.setdefault("pregnancy_checks", []).append(check_entry)
    save_data(data)

    return {
        "ok": True,
        "signs_count": signs_count,
        "recommendation": recommendation,
        "disclaimer": disclaimer,
    }


@app.get("/api/doctor/dashboard")
def doctor_dashboard(authorization: Optional[str] = Header(default=None)):
    data = load_data()
    doctor = _resolve_doctor(authorization, data)
    doctor_id = doctor["id"]
    all_patients = data.get("patients", {})
    all_appointments = data.get("appointments", [])

    patients = {
        pid: p
        for pid, p in all_patients.items()
        if (p.get("doctor_id") or "d-sarah") == doctor_id
    }
    appointments = [
        a
        for a in all_appointments
        if (a.get("doctor_id") or "d-sarah") == doctor_id
    ]

    total_patients = len(patients)
    upcoming_appointments = sum(1 for a in appointments if a.get("status") != "Completed")
    high_priority = sum(1 for p in patients.values() if p.get("high_priority", False))

    adherences = [p.get("adherence", 85) for p in patients.values()]
    avg_adherence = int(sum(adherences) / len(adherences)) if adherences else 0

    kpis = {
        "total_patients": total_patients,
        "upcoming_appointments": upcoming_appointments,
        "high_priority": high_priority,
        "avg_adherence": avg_adherence,
    }

    patient_summaries = list(patients.values())

    return {
        "doctor": doctor,
        "kpis": kpis,
        "patients": patient_summaries,
        "appointments": appointments,
    }


@app.post("/api/doctor/patients")
def doctor_create_patient(
    payload: DoctorPatientCreate,
    authorization: Optional[str] = Header(default=None),
):
    local_phone, _ = normalize_phone(payload.phone)
    data = load_data()
    doctor = _resolve_doctor(authorization, data)
    doctor_id = doctor["id"]
    patients = data["patients"]
    existing = next((p for p in patients.values() if normalize_phone_safe(p.get("phone")) == local_phone), None)
    if existing:
        raise HTTPException(status_code=400, detail="Patient with this phone already exists")

    new_patient = create_patient_record(
        patients,
        name=payload.name,
        phone=local_phone,
        age=payload.age,
        tag=payload.tag,
        summary=payload.summary,
        high_priority=payload.high_priority,
        doctor_id=doctor_id,
    )
    save_data(data)
    return {"ok": True, "patient": new_patient}


@app.get("/api/doctor/patients/{patient_id}")
def get_doctor_patient_detail(patient_id: str):
    data = load_data()
    patients = data["patients"]
    if patient_id not in patients:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patients[patient_id]


@app.post("/api/doctor/patients/{patient_id}/care-plan")
def doctor_add_care_plan(
    patient_id: str,
    payload: CarePlanCreate,
    authorization: Optional[str] = Header(default=None),
):
    data = load_data()
    doctor = _resolve_doctor(authorization, data)
    patients = data["patients"]
    if patient_id not in patients:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient = patients[patient_id]
    new_cp = {
        "id": f"cp-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "title": payload.title,
        "category": payload.category,
        "frequency": payload.frequency,
        "notes": payload.notes,
        "assigned_by": doctor["name"],
        "created_at": datetime.now().strftime("%Y-%m-%d"),
    }
    patient["care_plans"].append(new_cp)

    # Sync matching reminder to patient reminders
    new_rem = {
        "id": f"rem-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "name": payload.title,
        "time": payload.frequency,
        "done": False,
    }
    patient["reminders"].append(new_rem)

    save_data(data)
    return {
        "ok": True,
        "care_plans": patient["care_plans"],
        "reminders": patient["reminders"],
    }


@app.delete("/api/doctor/patients/{patient_id}/care-plan/{plan_id}")
def doctor_delete_care_plan(patient_id: str, plan_id: str):
    data = load_data()
    patients = data["patients"]
    if patient_id not in patients:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient = patients[patient_id]
    before = len(patient["care_plans"])
    patient["care_plans"] = [cp for cp in patient["care_plans"] if cp.get("id") != plan_id]
    if len(patient["care_plans"]) == before:
        raise HTTPException(status_code=404, detail="Care plan item not found")

    save_data(data)
    return {"ok": True, "care_plans": patient["care_plans"]}


@app.post("/api/doctor/patients/{patient_id}/reports")
def doctor_add_report(patient_id: str, payload: ReportCreate):
    data = load_data()
    patients = data["patients"]
    if patient_id not in patients:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient = patients[patient_id]
    new_rep = {
        "id": f"rep-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "title": payload.title,
        "date": payload.date or datetime.now().strftime("%Y-%m-%d"),
        "status": payload.status,
        "summary": payload.summary,
        "plain_explanation": payload.plain_explanation,
    }
    patient["reports"].insert(0, new_rep)
    save_data(data)
    return {"ok": True, "reports": patient["reports"]}


@app.get("/api/appointments")
def get_appointments():
    data = load_data()
    return data["appointments"]


@app.post("/api/appointments")
def create_appointment(payload: AppointmentCreate):
    local_phone, _ = normalize_phone(payload.phone)
    data = load_data()
    target_patient = find_patient_by_phone_or_id(
        data["patients"], patient_id=payload.patient_id, phone=local_phone
    )
    doctor_id = (
        (target_patient.get("doctor_id") if target_patient else None)
        or "d-sarah"
    )
    new_apt = {
        "id": f"apt-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "doctor_id": doctor_id,
        "patient_id": payload.patient_id or "p-priya",
        "name": payload.name,
        "phone": local_phone,
        "service": payload.service,
        "date": payload.date,
        "mode": payload.mode,
        "status": "Pending",
        "notes": payload.notes,
    }
    data["appointments"].append(new_apt)

    # If matching patient found, add a reminder
    if target_patient:
        new_rem = {
            "id": f"rem-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "name": f"Appointment: {payload.service}",
            "time": payload.date,
            "done": False,
        }
        target_patient["reminders"].append(new_rem)

    save_data(data)
    return {"ok": True, "appointment": new_apt}


@app.patch("/api/doctor/appointments/{appt_id}")
def update_appointment_status(appt_id: str, payload: AppointmentStatusUpdate):
    data = load_data()
    target_apt = None
    for apt in data["appointments"]:
        if apt["id"] == appt_id:
            apt["status"] = payload.status
            target_apt = apt
            break

    if not target_apt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    save_data(data)
    return {"ok": True, "appointment": target_apt}


@app.post("/api/clinics/onboard")
def onboard_clinic(payload: ClinicOnboard):
    try:
        norm_phone, _ = normalize_phone(payload.phone)
    except Exception:
        norm_phone = payload.phone
    data = load_data()
    submission = {
        "id": f"req-{secrets.token_hex(4)}",
        "doctor": payload.doctor,
        "clinicName": payload.clinicName,
        "city": payload.city,
        "phone": norm_phone,
        "status": "pending",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }
    data["clinics"].append(submission)
    save_data(data)
    return {"ok": True, "submission": submission}


@app.get("/api/admin/overview")
def admin_overview(authorization: Optional[str] = Header(default=None)):
    data = load_data()
    require_admin(authorization, data)

    doctors = data.get("doctors", {})
    clinic_requests = data.get("clinics", [])
    patients = data.get("patients", {})
    appointments = data.get("appointments", [])

    active_doctors = sum(
        1 for d in doctors.values() if d.get("status", "active") == "active"
    )
    pending_requests = sum(
        1 for c in clinic_requests if c.get("status", "pending") == "pending"
    )

    return {
        "kpis": {
            "total_doctors": len(doctors),
            "active_doctors": active_doctors,
            "pending_requests": pending_requests,
            "total_patients": len(patients),
            "total_appointments": len(appointments),
        },
        "doctors": list(doctors.values()),
        "clinic_requests": clinic_requests,
    }


@app.post("/api/admin/doctors")
def admin_create_doctor(
    payload: AdminDoctorCreate,
    authorization: Optional[str] = Header(default=None),
):
    data = load_data()
    require_admin(authorization, data)

    local_phone, _ = normalize_phone(payload.phone)
    doctors = data.setdefault("doctors", {})
    existing = next(
        (d for d in doctors.values() if normalize_phone_safe(d.get("phone")) == local_phone),
        None,
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Doctor with this phone already enrolled",
        )

    doc_id = f"d-{secrets.token_hex(4)}"
    clinics = [c.strip() for c in payload.clinics if isinstance(c, str) and c.strip()]
    new_doc = {
        "id": doc_id,
        "name": payload.name.strip(),
        "phone": local_phone,
        "email": payload.email.strip().lower() if payload.email else "",
        "specialty": payload.specialty.strip() or "Obstetrics & Gynecology",
        "clinics": clinics or ["Indore"],
        "nmc_reg": payload.nmc_reg.strip(),
        "status": "active",
        "experience": "",
    }
    doctors[doc_id] = new_doc
    save_data(data)
    return {"ok": True, "doctor": new_doc}


@app.patch("/api/admin/doctors/{doctor_id}")
def admin_update_doctor(
    doctor_id: str,
    payload: AdminDoctorUpdate,
    authorization: Optional[str] = Header(default=None),
):
    data = load_data()
    require_admin(authorization, data)

    doctors = data.get("doctors", {})
    doc = doctors.get(doctor_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")

    if payload.status is not None and payload.status.strip():
        doc["status"] = payload.status.strip().lower()
    if payload.name is not None and payload.name.strip():
        doc["name"] = payload.name.strip()
    if payload.specialty is not None and payload.specialty.strip():
        doc["specialty"] = payload.specialty.strip()
    if payload.clinics is not None:
        doc["clinics"] = [
            c.strip() for c in payload.clinics if isinstance(c, str) and c.strip()
        ]
    if payload.nmc_reg is not None:
        doc["nmc_reg"] = payload.nmc_reg.strip()

    save_data(data)
    return {"ok": True, "doctor": doc}


@app.post("/api/admin/clinic-requests/{req_id}/approve")
def admin_approve_clinic_request(
    req_id: str,
    authorization: Optional[str] = Header(default=None),
):
    data = load_data()
    require_admin(authorization, data)

    clinic_requests = data.get("clinics", [])
    target_req = next((c for c in clinic_requests if c.get("id") == req_id), None)
    if not target_req:
        raise HTTPException(status_code=404, detail="Clinic request not found")

    target_req["status"] = "approved"

    doctors = data.setdefault("doctors", {})
    norm_phone = normalize_phone_safe(target_req.get("phone"))
    existing_doc = (
        next(
            (
                d
                for d in doctors.values()
                if norm_phone and normalize_phone_safe(d.get("phone")) == norm_phone
            ),
            None,
        )
        if norm_phone
        else None
    )

    if existing_doc:
        new_doc = existing_doc
    else:
        doc_id = f"d-{secrets.token_hex(4)}"
        clinic_name = (target_req.get("clinicName") or "").strip()
        city = (target_req.get("city") or "Indore").strip()
        clinic_label = f"{clinic_name}, {city}".strip(", ") if clinic_name else city
        new_doc = {
            "id": doc_id,
            "name": (target_req.get("doctor") or "New Gynecologist").strip(),
            "phone": norm_phone,
            "email": "",
            "specialty": "Obstetrics & Gynecology",
            "clinics": [clinic_label] if clinic_label else ["Indore"],
            "nmc_reg": "",
            "status": "active",
            "experience": "",
        }
        doctors[doc_id] = new_doc

    save_data(data)
    return {
        "ok": True,
        "doctor": new_doc,
        "clinic_requests": clinic_requests,
    }


@app.post("/api/admin/clinic-requests/{req_id}/reject")
def admin_reject_clinic_request(
    req_id: str,
    authorization: Optional[str] = Header(default=None),
):
    data = load_data()
    require_admin(authorization, data)

    clinic_requests = data.get("clinics", [])
    target_req = next((c for c in clinic_requests if c.get("id") == req_id), None)
    if not target_req:
        raise HTTPException(status_code=404, detail="Clinic request not found")

    target_req["status"] = "rejected"
    save_data(data)
    return {"ok": True, "clinic_requests": clinic_requests}


# SPA Static Assets & Catch-All
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
assets_dir = FRONTEND_DIST / "assets"
if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    if full_path == "api" or full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not Found")
    if full_path:
        candidate = (FRONTEND_DIST / full_path).resolve()
        if candidate.is_file() and str(candidate).startswith(str(FRONTEND_DIST.resolve())):
            return FileResponse(candidate)
    index_file = FRONTEND_DIST / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"status": "ok", "message": "GynAura API running. Frontend build not found."}
