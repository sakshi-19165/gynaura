# GynAura

Connected women's healthcare platform built for gynecologists and patients (launching in Indore, MP). GynAura pairs a longitudinal gynecologist clinical console with an auth-gated 10-module user health companion, backed by FastAPI and MongoDB Atlas.

> **Medical Disclaimer:** GynAura's AI health guidance and pregnancy-related features provide educational support only and do not replace medical diagnosis, clinical consultation, or pregnancy testing.

---

## Architecture & Tech Stack

| Layer | Technology |
| --- | --- |
| **Web Frontend** | React 18, React Router, Vite 5, Custom Dark-Mode CSS |
| **Backend API** | Python 3.11, FastAPI, Pydantic, Uvicorn |
| **Database** | MongoDB Atlas (`pymongo[srv]`) with local JSON fallback (`data.json`) |
| **Authentication** | Google OAuth (Google Identity Services) + OTP-based auth (Twilio SMS or Demo mode) |
| **Deployment** | Render Blueprint (`render.yaml`) — single-service FastAPI + built React SPA |

---

## Views & Role Separation

- **`/` — Public Landing Page**: Platform overview, clinical specialties, Indore clinic onboarding form, specialist profile, and consultation booking.
- **`/login` — Unified Auth Portal**: Passwordless **Continue with Google** + **OTP** sign-in and **New User** registration, routing strictly by role (`User`, `Doctor`, or `Admin`).
- **`/user` — User View (10 Modules)**:
  1. Period Tracking (cycle ring, fertile window, next period prediction)
  2. Am I Pregnant? (non-diagnostic symptom & next-step guide)
  3. Online Consultation (video/audio slot booking)
  4. Mood Tracking
  5. Medical History & Diagnostic Reports
  6. Flow, Pain & Symptom Tracker
  7. Understanding Reports & Prescriptions (lab glossary + plain-language notes)
  8. Appointment & Medicine Reminders (interactive checklist + add/delete)
  9. Intimate Hygiene Education
  10. PCOS & PCOD Module (daily habit & endocrine lab tracking)
  - Includes **Synced Care Plan** strip from your gynecologist and **Edit Account**.
- **`/doctor` — Gynecologist Console**: Multi-doctor isolated patient roster, `+ Add Patient`, longitudinal cycle/mood/symptom logs, Care Plan & Rx assignment (syncs live to User View), Lab Report publishing, Appointments Queue, and **Edit Account**.
- **`/admin` — Admin Portal**: Enroll new gynecologists (with NMC registration), suspend/reactivate doctor accounts, and approve or reject incoming Indore clinic onboarding requests.

---

## Local Development

### 1. Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # Optional: configure GOOGLE_CLIENT_ID, MONGODB_URI, TWILIO_*
uvicorn main:app --host 127.0.0.1 --port 8000
```
API docs: `http://127.0.0.1:8000/docs` · Health check: `http://127.0.0.1:8000/api/health`

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev -- --port 5175
```
Open `http://localhost:5175` (Vite proxies `/api/*` to `http://127.0.0.1:8000`).

---

## Deploy on Render

This repository includes a [`render.yaml`](render.yaml) Blueprint that builds `frontend/dist` and serves both the React SPA and `/api/*` from FastAPI:

1. In [Render Dashboard](https://dashboard.render.com), click **New → Blueprint** and select this repository.
2. Add your environment variables in Render → **Environment**:
   - `MONGODB_URI` — MongoDB Atlas `mongodb+srv://...` connection string
   - `GOOGLE_CLIENT_ID` — Google Web OAuth Client ID
   - `ADMIN_KEY` — Secret key for `/admin` login
   - `ADMIN_EMAILS` — Comma-separated Google emails allowed into `/admin`
   - `DOCTOR_EMAILS` — *(optional)* Comma-separated Google emails allowed into `/doctor`
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` — *(optional)* For live SMS OTP
3. Add your live Render URL (`https://<your-service>.onrender.com`) under **Authorized JavaScript origins** in Google Cloud Console.
