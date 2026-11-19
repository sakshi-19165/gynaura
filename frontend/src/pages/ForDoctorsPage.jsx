import React, { useState } from 'react'
import { Icon, I } from '../components/Icons.jsx'

const workflows = [
  { t: 'Structured OB/GYN Records', d: 'Replace scattered paper files with longitudinal antenatal, PCOS, and surgical histories in one clinical view.', i: I.clip },
  { t: 'Digital Care Plan Assignment', d: 'Assign trimester milestones, medication schedules, and scan reminders directly to your patient’s Flutter app.', i: I.cal },
  { t: 'Follow-Up & Adherence Tracking', d: 'See which patients completed scheduled labs or missed follow-ups before they fall through the cracks.', i: I.wave },
  { t: 'Clinic-First Onboarding', d: 'Built for busy Indore practices — zero complex EMR bloat, fast FastAPI backend, and OTP-verified patient linking.', i: I.shield },
]

export default function ForDoctorsPage() {
  const [clinic, setClinic] = useState({ doctor: '', clinicName: '', city: 'Indore', phone: '' })
  const [msg, setMsg] = useState('')
  const on = (k) => (e) => setClinic({ ...clinic, [k]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    if (!/^[6-9]\d{9}$/.test(clinic.phone)) return setMsg('Please enter a valid 10-digit mobile number.')
    setMsg(`Onboarding request noted for ${clinic.doctor} (${clinic.clinicName}). Our Indore team will reach out.`)
  }

  return (
    <section className="wrap sec">
      <div className="center">
        <span className="eyebrow">For Gynecologists &amp; Clinics</span>
        <h1>Practice Workflows Designed Around Gynecologists</h1>
        <p className="muted">Solve follow-up drop-offs and paper record clutter first — and give every patient a seamless digital extension of your clinic.</p>
      </div>

      <div className="grid2-equal">
        {workflows.map((w) => (
          <article key={w.t} className="card">
            <div className="ico"><Icon d={w.i} /></div>
            <h3>{w.t}</h3>
            <p className="muted">{w.d}</p>
          </article>
        ))}
      </div>

      <div className="card booking" style={{ marginTop: 32 }}>
        <form onSubmit={submit}>
          <span className="eyebrow">Doctor Subscription · MVP Pilot</span>
          <h2>Request Clinic Onboarding</h2>
          <p className="muted">Join our initial Indore gynecologist cohort for structured patient care plans and portal access.</p>
          <div className="grid2 sm">
            <label>Doctor Name<input required value={clinic.doctor} onChange={on('doctor')} placeholder="Dr. Full Name" /></label>
            <label>Clinic / Hospital<input required value={clinic.clinicName} onChange={on('clinicName')} placeholder="Clinic name" /></label>
          </div>
          <div className="grid2 sm">
            <label>City<input required value={clinic.city} onChange={on('city')} /></label>
            <label>Mobile Number<input required value={clinic.phone} onChange={on('phone')} placeholder="10-digit mobile" maxLength={10} /></label>
          </div>
          <button className="btn full">Request Doctor Demo</button>
          {msg && <p className="status">{msg}</p>}
        </form>
        <aside>
          <h4>Why Doctors Start Here</h4>
          <div className="info"><Icon d={I.check} /><div><b>Zero Paper Clutter</b><small>Ultrasound &amp; lab timelines stay attached to the patient profile.</small></div></div>
          <div className="info"><Icon d={I.check} /><div><b>Higher Follow-Up Retention</b><small>Automated trimester &amp; PCOS review nudges.</small></div></div>
          <div className="info"><Icon d={I.check} /><div><b>Unified Design System</b><small>Shared FastAPI backend with the patient Flutter app.</small></div></div>
        </aside>
      </div>
    </section>
  )
}
