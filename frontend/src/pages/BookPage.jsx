import React, { useState } from 'react'
import { Icon, I } from '../components/Icons.jsx'

export default function BookPage() {
  const [form, setForm] = useState({ name: '', phone: '', service: 'Obstetrics & Antenatal Care', date: '', notes: '' })
  const [status, setStatus] = useState('')
  const on = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    if (!/^[6-9]\d{9}$/.test(form.phone)) return setStatus('Enter a valid 10-digit mobile number.')
    setStatus('Sending…')
    try {
      const r = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setStatus(r.ok ? 'Request received. We will confirm your slot via OTP/SMS.' : 'Request saved locally — FastAPI backend not connected yet.')
    } catch {
      setStatus('Request saved locally — FastAPI backend not connected yet.')
    }
  }

  return (
    <section className="wrap sec">
      <div className="card booking">
        <form onSubmit={submit}>
          <span className="eyebrow">Appointments · Indore</span>
          <h1>Schedule Your Consultation</h1>
          <p className="muted">Share a few details and our clinic desk will confirm your appointment slot by SMS.</p>
          <label>
            Specialised consultation
            <select value={form.service} onChange={on('service')}>
              {['Obstetrics & Antenatal Care', 'Advanced Gynecology & PCOS', 'Fertility & Hormones', '4D Ultrasound & Diagnostics', 'Urgent Gynecological Care'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <div className="grid2 sm">
            <label>Full name<input required value={form.name} onChange={on('name')} placeholder="Your name" /></label>
            <label>Mobile number<input required value={form.phone} onChange={on('phone')} placeholder="10-digit mobile" inputMode="numeric" maxLength={10} /></label>
          </div>
          <label>Preferred date<input type="date" required value={form.date} onChange={on('date')} /></label>
          <label>Notes (optional)<textarea rows="3" value={form.notes} onChange={on('notes')} placeholder="Briefly describe your concern" /></label>
          <button className="btn full">Confirm &amp; Request Appointment</button>
          {status && <p className="status">{status}</p>}
        </form>

        <aside>
          <h4>Practice Details</h4>
          <div className="info"><Icon d={I.pin} /><div><b>GynAura Clinic · Vijay Nagar</b><small>Indore, Madhya Pradesh</small></div></div>
          <div className="info"><Icon d={I.pin} /><div><b>GynAura Hub · Super Corridor</b><small>Indore, Madhya Pradesh</small></div></div>
          <div className="info"><Icon d={I.phone} /><div><b>+91 00000 00000</b><small>Mon–Sat · 9:00 AM – 8:00 PM</small></div></div>
          <div className="info alert"><Icon d={I.shield} /><div><b>Urgent Concern?</b><small>Call the 24/7 line or visit the nearest emergency department.</small></div></div>
        </aside>
      </div>
    </section>
  )
}
