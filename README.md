# GynAura

**Connected Women's Healthcare Platform** — built for gynecologists and women, launching in **Indore, Madhya Pradesh**.

GynAura bridges the continuity gap between clinic visits by pairing a structured clinical workspace for gynecologists with a calm, auth-gated 10-module health companion for users.

> **Disclaimer:** GynAura's AI health guidance and pregnancy-related features provide educational support only and do not replace medical diagnosis, clinical consultation, or pregnancy testing.

---

## Core Focus

- **Doctor-First Adoption**: Streamlines longitudinal OB/GYN records, trimester scan tracking, and digital care plan assignment so gynecologists eliminate paper clutter and improve follow-up adherence.
- **Role-Separated Architecture**: Clean separation between the public platform (`/`), unified passwordless login (`/login`), User Health Hub (`/user`), Gynecologist Console (`/doctor`), and Admin Enrollment Portal (`/admin`).

---

## Key Capabilities

### User View (`/user`)
- **01 · Period Tracking** — Cycle day ring, fertile window, and next-period prediction
- **02 · Am I Pregnant?** — Non-diagnostic symptom checklist and next-step guidance
- **03 · Online Consultation** — Video/audio slot booking with Indore specialists
- **04 · Mood Tracking** — Daily mood & energy check-in linked to cycle phase
- **05 · Medical History & Reports** — Longitudinal vault for ultrasound and lab panels
- **06 · Flow, Pain & Symptoms** — Flow intensity, 0–10 pelvic pain scale, and symptom tags
- **07 · Understanding Reports & Rx** — Plain-language lab glossary (`AMH`, `TSH`, `HbA1c`, `USG`) and doctor notes
- **08 · Appointment & Med Reminders** — Interactive daily checklist and custom reminders
- **09 · Intimate Hygiene Education** — Evidence-based, stigma-free guidance
- **10 · PCOS & PCOD Module** — Daily habit tracking and endocrine lab overview

### Gynecologist Console (`/doctor`)
- Isolated per-doctor patient roster with priority flags and category filters (`Antenatal`, `PCOS`, `Fertility`, `High-Risk`)
- Real-time visibility into user-logged cycle, mood, flow, pain, and PCOS habits
- One-click **Care Plan Assignment** (syncs directly to User View) and **Lab Report Publishing**
- Consultation **Appointments Queue** with status management (`Confirmed`, `Completed`)

### Admin Portal (`/admin`)
- Gynecologist enrollment with NMC registration tracking, account status controls, and 1-click approval for incoming clinic onboarding requests.

---

## Technology Stack

| Layer | Stack |
| --- | --- |
| **Web Frontend** | React 18, React Router, Vite 5 |
| **Backend API** | Python 3.11, FastAPI, Pydantic |
| **Database** | MongoDB Atlas |
| **Authentication** | Google OAuth & OTP-based authentication |
| **Mobile Companion** | Flutter (shared REST API & design system) |
