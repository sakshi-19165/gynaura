import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, I } from '../components/Icons.jsx'

const modules = [
  { id: 'period', num: '01', label: 'Period Tracking' },
  { id: 'pregnant', num: '02', label: 'Am I Pregnant?' },
  { id: 'consult', num: '03', label: 'Online Consultation' },
  { id: 'mood', num: '04', label: 'Mood Tracking' },
  { id: 'history', num: '05', label: 'Medical History & Reports' },
  { id: 'symptoms', num: '06', label: 'Flow, Pain & Symptoms' },
  { id: 'rx', num: '07', label: 'Understanding Reports & Rx' },
  { id: 'reminders', num: '08', label: 'Appointment & Med Reminders' },
  { id: 'hygiene', num: '09', label: 'Intimate Hygiene Education' },
  { id: 'pcos', num: '10', label: 'PCOS & PCOD Module' },
]

const rxGlossary = {
  AMH: { range: '1.0 – 4.0 ng/mL', note: 'Anti-Müllerian Hormone: reflects ovarian egg reserve. Interpreted alongside age and ultrasound by your gynecologist.' },
  TSH: { range: '0.4 – 4.0 mIU/L', note: 'Thyroid-Stimulating Hormone: thyroid imbalance can affect menstrual regularity, ovulation, and pregnancy.' },
  HbA1c: { range: '< 5.7%', note: '3-month average blood sugar: commonly checked in PCOS and pregnancy to screen for insulin resistance.' },
  'USG Pelvis': { range: 'Imaging Scan', note: 'Pelvic Ultrasound: visualizes uterine lining, ovaries, and follicles; functional cysts are common and often resolve.' },
}

export default function PortalPage() {
  const [active, setActive] = useState('period')
  const [phone, setPhone] = useState('')
  const [otpStep, setOtpStep] = useState('phone')
  const [otp, setOtp] = useState('')
  const [otpMsg, setOtpMsg] = useState('')

  const [cycleLen, setCycleLen] = useState(28)
  const [lastPeriod, setLastPeriod] = useState('2026-11-01')
  const [pregChecks, setPregChecks] = useState(['Missed period (>5 days)'])
  const [slot, setSlot] = useState('Today · 4:30 PM IST (Video)')
  const [mood, setMood] = useState('Calm')
  const [flow, setFlow] = useState('Medium')
  const [pain, setPain] = useState(3)
  const [symp, setSymp] = useState(['Cramps'])
  const [rxTerm, setRxTerm] = useState('AMH')
  const [meds, setMeds] = useState([
    { name: 'Folic Acid 5mg', time: '9:00 AM · After breakfast', done: true },
    { name: 'Iron + Vitamin C', time: '2:00 PM · After lunch', done: false },
    { name: 'Gynec Follow-Up · Vijay Nagar', time: 'Tue 10:30 AM', done: false },
  ])
  const [pcosHabits, setPcosHabits] = useState(['Protein-first breakfast', '30 min brisk walk'])

  const toggleArr = (arr, setArr, val) =>
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val])

  const nextDate = () => {
    const d = new Date(lastPeriod)
    if (isNaN(d)) return '—'
    d.setDate(d.getDate() + Number(cycleLen))
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const cycleDay = () => {
    const d = new Date(lastPeriod)
    if (isNaN(d)) return 14
    const diff = Math.max(1, Math.floor((Date.now() - d.getTime()) / 86400000) + 1)
    return ((diff - 1) % Number(cycleLen)) + 1
  }

  const day = cycleDay()
  const ringOffset = Math.max(20, 389 - (389 * Math.min(day / Number(cycleLen), 1)))
  const doneCount = meds.filter((m) => m.done).length
  const painColor = pain <= 3 ? 'var(--ok)' : pain <= 6 ? '#fbbf24' : '#f87171'

  const sendOtp = (e) => {
    e.preventDefault()
    if (!/^[6-9]\d{9}$/.test(phone)) return setOtpMsg('Enter a valid 10-digit mobile number.')
    setOtpMsg('')
    setOtpStep('otp')
  }

  const verifyOtp = (e) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(otp)) return setOtpMsg('Enter 6-digit OTP.')
    setOtpMsg(`Verified +91 ${phone} · Synced with Flutter App`)
    setOtpStep('done')
  }

  return (
    <section className="band">
      <div className="wrap sec">
        <div className="portal-head">
          <div>
            <span className="eyebrow">Patient Workspace · 10 Core Modules</span>
            <h1>Your Connected Women&apos;s Health Hub</h1>
            <p className="muted">Track cycles, symptoms, reports, and doctor-assigned plans in one private place.</p>
          </div>
          <div className="card otp-mini">
            <small className="eyebrow">OTP Authentication</small>
            {otpStep === 'phone' && (
              <form onSubmit={sendOtp} className="otp-form">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" maxLength={10} />
                <button className="btn sm">Send OTP</button>
              </form>
            )}
            {otpStep === 'otp' && (
              <form onSubmit={verifyOtp} className="otp-form">
                <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit OTP" maxLength={6} />
                <button className="btn sm">Verify</button>
              </form>
            )}
            {otpStep === 'done' && <p className="status" style={{ marginTop: 6 }}>{otpMsg}</p>}
            {otpStep !== 'done' && otpMsg && <p className="status">{otpMsg}</p>}
          </div>
        </div>

        <div className="patient-shell">
          <aside className="mod-nav">
            {modules.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`mod-btn ${active === m.id ? 'on' : ''}`}
                onClick={() => setActive(m.id)}
              >
                <span className="mod-num">{m.num}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </aside>

          <div className="card mod-body" key={active}>
            {active === 'period' && (
              <div className="mod-fade">
                <span className="chip">01 · Period Tracking</span>
                <h2>Cycle &amp; Period Predictor</h2>
                <div className="cycle-grid">
                  <div className="ring-wrap" style={{ width: 156, height: 156 }}>
                    <svg className="cycle-ring" viewBox="0 0 160 160">
                      <defs>
                        <linearGradient id="pGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#f7c8e5" />
                          <stop offset="100%" stopColor="#b84b8e" />
                        </linearGradient>
                      </defs>
                      <circle cx="80" cy="80" r="62" className="ring-bg" />
                      <circle cx="80" cy="80" r="62" className="ring-fg" stroke="url(#pGrad)" strokeDasharray="389" strokeDashoffset={ringOffset} />
                    </svg>
                    <div className="ring-center">
                      <small>Cycle</small>
                      <strong>Day {day}</strong>
                      <span>of {cycleLen}d</span>
                    </div>
                  </div>
                  <div>
                    <div className="grid2 sm" style={{ marginTop: 0 }}>
                      <label>Last period start<input type="date" value={lastPeriod} onChange={(e) => setLastPeriod(e.target.value)} /></label>
                      <label>Cycle length (days)<input type="number" min="21" max="45" value={cycleLen} onChange={(e) => setCycleLen(e.target.value)} /></label>
                    </div>
                    <div className="mod-stat">
                      <div><small>Estimated next period</small><strong>{nextDate()}</strong></div>
                      <div><small>Fertile window</small><strong>Days {Math.max(8, Math.round(cycleLen / 2) - 3)}–{Math.round(cycleLen / 2) + 1}</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {active === 'pregnant' && (
              <div className="mod-fade">
                <span className="chip">02 · Educational Check</span>
                <h2>Am I Pregnant? — Symptom &amp; Next-Step Guide</h2>
                <p className="muted">Select any signs you are noticing. Educational support only — never replaces a pregnancy test or clinical diagnosis.</p>
                <div className="tag-grid">
                  {['Missed period (>5 days)', 'Morning nausea', 'Breast tenderness', 'Fatigue', 'Light spotting'].map((s) => (
                    <button key={s} type="button" className={`filter-btn ${pregChecks.includes(s) ? 'on' : ''}`} onClick={() => toggleArr(pregChecks, setPregChecks, s)}>{s}</button>
                  ))}
                </div>
                <div className="info alert" style={{ marginTop: 20 }}>
                  <Icon d={I.shield} />
                  <div>
                    <b>Next Step ({pregChecks.length} signs selected)</b>
                    <small>Take a home urine hCG test 7 days after a missed period, or confirm with a beta-hCG blood test &amp; gynecologist consult.</small>
                  </div>
                </div>
                <Link to="/book" className="btn" style={{ marginTop: 16 }}>Book Early-Pregnancy Consult</Link>
              </div>
            )}

            {active === 'consult' && (
              <div className="mod-fade">
                <span className="chip">03 · Tele-Gynecology</span>
                <h2>Online Consultation</h2>
                <p className="muted">Choose a secure video or audio slot with an Indore gynecologist. Your cycle &amp; symptom log is shared automatically.</p>
                <div className="tag-grid" style={{ marginTop: 16 }}>
                  {['Today · 4:30 PM IST (Video)', 'Today · 7:15 PM IST (Audio)', 'Tomorrow · 11:00 AM IST (Video)'].map((s) => (
                    <button key={s} type="button" className={`filter-btn ${slot === s ? 'on' : ''}`} onClick={() => setSlot(s)}>{s}</button>
                  ))}
                </div>
                <div className="mini" style={{ marginTop: 18 }}>
                  <small>Selected Tele-Consult Slot</small>
                  <b>{slot}</b>
                </div>
                <div className="row"><Link to="/book" className="btn">Confirm Online Slot <Icon d={I.arrow} size={16} /></Link></div>
              </div>
            )}

            {active === 'mood' && (
              <div className="mod-fade">
                <span className="chip">04 · Emotional Wellness</span>
                <h2>Daily Mood &amp; Energy Check-In</h2>
                <p className="muted">Tracking mood alongside your cycle helps your gynecologist spot PMS, PMDD, or hormonal shifts.</p>
                <div className="tag-grid">
                  {['Calm', 'Energized', 'Fatigued', 'Anxious', 'Irritable', 'Low'].map((m) => (
                    <button key={m} type="button" className={`filter-btn ${mood === m ? 'on' : ''}`} onClick={() => setMood(m)}>{m}</button>
                  ))}
                </div>
                <div className="mod-stat">
                  <div><small>Logged today</small><strong>{mood}</strong></div>
                  <div><small>Cycle correlation</small><strong>Day {day} · {day > 14 ? 'Luteal' : 'Follicular'}</strong></div>
                </div>
              </div>
            )}

            {active === 'history' && (
              <div className="mod-fade">
                <span className="chip">05 · Longitudinal Vault</span>
                <h2>Medical History &amp; Reports</h2>
                <div className="mod-list">
                  <div className="info"><Icon d={I.clip} /><div><b>Pelvic Ultrasound Report · Normal</b><small>12 Oct 2026 · Normal endometrial thickness · Reviewed by Dr. Jenkins</small></div></div>
                  <div className="info"><Icon d={I.flask} /><div><b>Thyroid &amp; CBC Panel · Within Range</b><small>03 Oct 2026 · TSH 2.4 mIU/L · Hb 12.1 g/dL</small></div></div>
                  <div className="info"><Icon d={I.user} /><div><b>OB/GYN Baseline Profile</b><small>No drug allergies · Regular 28-day cycle history</small></div></div>
                </div>
              </div>
            )}

            {active === 'symptoms' && (
              <div className="mod-fade">
                <span className="chip">06 · Daily Log</span>
                <h2>Flow, Pain &amp; Symptom Tracker</h2>
                <label>Menstrual Flow</label>
                <div className="tag-grid">
                  {['Spotting', 'Light', 'Medium', 'Heavy'].map((f) => (
                    <button key={f} type="button" className={`filter-btn ${flow === f ? 'on' : ''}`} onClick={() => setFlow(f)}>{f}</button>
                  ))}
                </div>
                <label style={{ marginTop: 18 }}>
                  Pelvic Pain Level: <b style={{ color: painColor }}>{pain}/10 ({pain <= 3 ? 'Mild' : pain <= 6 ? 'Moderate' : 'Severe'})</b>
                </label>
                <input type="range" min="0" max="10" value={pain} onChange={(e) => setPain(Number(e.target.value))} />
                <label>Symptoms</label>
                <div className="tag-grid">
                  {['Cramps', 'Bloating', 'Headache', 'Backache', 'Acne', 'Clots'].map((s) => (
                    <button key={s} type="button" className={`filter-btn ${symp.includes(s) ? 'on' : ''}`} onClick={() => toggleArr(symp, setSymp, s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {active === 'rx' && (
              <div className="mod-fade">
                <span className="chip">07 · Plain-Language Guide</span>
                <h2>Understanding Reports &amp; Prescriptions</h2>
                <p className="muted">Tap a common gynecology lab or scan term to read an educational summary (always confirm with your doctor).</p>
                <div className="tag-grid">
                  {Object.keys(rxGlossary).map((k) => (
                    <button key={k} type="button" className={`filter-btn ${rxTerm === k ? 'on' : ''}`} onClick={() => setRxTerm(k)}>{k}</button>
                  ))}
                </div>
                <div className="mini" style={{ marginTop: 18 }}>
                  <div className="card-top"><b>{rxTerm}</b><span className="chip">{rxGlossary[rxTerm].range}</span></div>
                  <p className="muted" style={{ marginTop: 8 }}>{rxGlossary[rxTerm].note}</p>
                </div>
              </div>
            )}

            {active === 'reminders' && (
              <div className="mod-fade">
                <div className="card-top">
                  <span className="chip">08 · Adherence</span>
                  <small className="muted">{doneCount} of {meds.length} completed</small>
                </div>
                <h2>Appointment &amp; Medicine Reminders</h2>
                <div className="bar"><i style={{ width: `${(doneCount / meds.length) * 100}%` }} /></div>
                <div className="mod-list">
                  {meds.map((m, idx) => (
                    <button
                      key={m.name}
                      type="button"
                      className="info rem-row"
                      onClick={() => setMeds(meds.map((x, i) => (i === idx ? { ...x, done: !x.done } : x)))}
                    >
                      <Icon d={I.check} />
                      <div>
                        <b style={{ textDecoration: m.done ? 'line-through' : 'none', opacity: m.done ? 0.55 : 1 }}>{m.name}</b>
                        <small>{m.time} · {m.done ? 'Completed' : 'Tap to mark done'}</small>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {active === 'hygiene' && (
              <div className="mod-fade">
                <span className="chip">09 · Stigma-Free Care</span>
                <h2>Intimate Hygiene Education</h2>
                <div className="grid2 sm" style={{ marginTop: 16 }}>
                  <div className="mini"><small>pH Balance</small><b>Plain lukewarm water externally; avoid scented washes or douching.</b></div>
                  <div className="mini"><small>Period Care</small><b>Change pads every 4–6 hours and sanitize menstrual cups regularly.</b></div>
                  <div className="mini"><small>Daily Comfort</small><b>Wear breathable cotton underwear and wipe front-to-back.</b></div>
                  <div className="mini"><small>When to Consult</small><b>See a gynecologist for itching, unusual odor, burning, or abnormal discharge.</b></div>
                </div>
              </div>
            )}

            {active === 'pcos' && (
              <div className="mod-fade">
                <span className="chip">10 · Condition Care</span>
                <h2>PCOS &amp; PCOD Management Module</h2>
                <p className="muted">Track daily insulin-sensitivity habits and core hormone markers shared with your Indore gynecologist.</p>
                <div className="tag-grid" style={{ marginTop: 14 }}>
                  {['Protein-first breakfast', '30 min brisk walk', '2.5L hydration', '8h sleep'].map((h) => (
                    <button key={h} type="button" className={`filter-btn ${pcosHabits.includes(h) ? 'on' : ''}`} onClick={() => toggleArr(pcosHabits, setPcosHabits, h)}>{h}</button>
                  ))}
                </div>
                <div className="grid2 sm">
                  <div className="mini"><small>Daily Habits Completed</small><b>{pcosHabits.length} / 4 logged today</b></div>
                  <div className="mini"><small>Key Endocrine Labs</small><b>LH/FSH · Fasting Insulin · TSH</b></div>
                </div>
                <Link to="/book" className="link">Book PCOS Specialist Review <Icon d={I.arrow} size={14} /></Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
