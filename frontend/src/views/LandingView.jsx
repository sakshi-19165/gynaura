import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Icon, I, Avatar } from '../components/Icons.jsx'
import { CountUp, TiltCard } from '../components/Motion.jsx'
import { apiPost } from '../api.js'

const stages = [
  { name: 'Initial Consult', pct: 20, note: 'Intake history, baseline vitals & symptom mapping' },
  { name: 'Diagnostics & Labs', pct: 40, note: 'Ultrasound, hormone panels & digital report sync' },
  { name: 'Structured Plan', pct: 60, note: 'Gynecologist-assigned care plan & trimester milestones' },
  { name: 'Active Follow-Up', pct: 80, note: 'Automated visit reminders & guided educational support' },
  { name: 'Ongoing Wellness', pct: 100, note: 'Long-term preventive screening & postnatal care' },
]

const pillars = [
  { cat: 'Pregnancy', t: 'Obstetrics & High-Risk Maternal Care', d: 'Complete antenatal care, trimester-wise growth scans, and delivery planning — with dedicated monitoring for gestational diabetes and hypertension.', bullets: ['Trimester-wise care plans', 'Gestational diabetes & BP monitoring', 'Normal & C-section deliveries', 'Postnatal & lactation support'], i: I.heart },
  { cat: 'Pregnancy', t: '4D Ultrasound & Diagnostics', d: 'In-house obstetric and pelvic imaging with structured digital reports synced directly to the patient portal.', bullets: ['NT & anomaly scans', 'Doppler & fetal growth tracking', 'Pelvic ultrasound diagnostics', 'Instant portal report delivery'], i: I.wave },
  { cat: 'Gynecology', t: 'Advanced Gynecology & PCOS', d: 'Evidence-based management for PCOS, uterine fibroids, endometriosis, and menstrual cycle irregularities.', bullets: ['PCOS metabolic & cycle plans', 'Minimally invasive laparoscopy', 'Endometriosis pain management', 'Annual preventive screening'], i: I.clip },
  { cat: 'Fertility', t: 'Fertility & Hormone Care', d: 'Ovulation tracking, endocrine evaluation, and preconception counselling with transparent next steps.', bullets: ['Follicular & ovulation tracking', 'Thyroid & AMH hormone panels', 'Preconception wellness plans', 'Partner workup coordination'], i: I.flask },
  { cat: 'Urgent', t: 'Urgent Gynecological Care', d: 'Same-day clinical evaluation for acute pelvic pain, abnormal bleeding, or early-pregnancy concerns.', bullets: ['Same-day Indore clinic slots', 'Early-pregnancy reassurance scans', 'Acute infection & pain triage', '24/7 on-call escalation'], i: I.shield },
]

const reviews = [
  { n: 'Priya Sharma', r: 'Antenatal patient · Indore', q: 'Every visit felt calm and unhurried. Having ultrasound reports on my phone saved so many trips.' },
  { n: 'Neha Verma', r: 'PCOS care · Vijay Nagar', q: 'Finally a doctor who explained everything clearly. Follow-ups and lab timelines were completely organized.' },
  { n: 'Ritu Jain', r: 'Fertility care · Indore', q: 'Respectful, private, and evidence-based. I always knew what the next step in my care plan was.' },
]

export default function LandingView() {
  const [activeStage, setActiveStage] = useState(2)
  const [ringOffset, setRingOffset] = useState(389)
  const [specFilter, setSpecFilter] = useState('All')

  // For Gynecologists onboarding state
  const [clinic, setClinic] = useState({ doctor: '', clinicName: '', city: 'Indore', phone: '' })
  const [clinicMsg, setClinicMsg] = useState('')
  const [clinicLoading, setClinicLoading] = useState(false)

  // Booking consultation state
  const [form, setForm] = useState({ name: '', phone: '', service: 'Obstetrics & Antenatal Care', date: '', notes: '' })
  const [bookStatus, setBookStatus] = useState('')
  const [bookLoading, setBookLoading] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setRingOffset(115), 180)
    return () => clearTimeout(t)
  }, [])

  const visiblePillars = specFilter === 'All' ? pillars : pillars.filter((p) => p.cat === specFilter)

  const handleClinicSubmit = async (e) => {
    e.preventDefault()
    if (!/^[6-9]\d{9}$/.test(clinic.phone)) {
      setClinicMsg('Please enter a valid 10-digit mobile number.')
      return
    }
    setClinicLoading(true)
    setClinicMsg('Submitting clinic onboarding request...')
    try {
      await apiPost('/clinics/onboard', clinic)
      setClinicMsg('Onboarding request received successfully! Our Indore clinical team will reach out.')
    } catch (err) {
      setClinicMsg(err.message || 'Saved locally (Backend not connected). We will contact you soon.')
    } finally {
      setClinicLoading(false)
    }
  }

  const handleBookingSubmit = async (e) => {
    e.preventDefault()
    if (!/^[6-9]\d{9}$/.test(form.phone)) {
      setBookStatus('Please enter a valid 10-digit mobile number.')
      return
    }
    setBookLoading(true)
    setBookStatus('Submitting appointment request...')
    try {
      await apiPost('/appointments', form)
      setBookStatus('Appointment requested successfully! We will confirm your slot via SMS.')
    } catch (err) {
      setBookStatus(err.message || 'Saved locally (Backend not connected). We will confirm your slot shortly.')
    } finally {
      setBookLoading(false)
    }
  }

  return (
    <>
      {/* 1. OVERVIEW / HERO */}
      <section id="overview" className="hero-bg">
        <div className="aurora a1" aria-hidden="true" />
        <div className="aurora a2" aria-hidden="true" />
        <div className="grid-mesh" aria-hidden="true" />
        <div className="hero wrap">
          <div>
            <span className="pill"><i className="dot pulse" />Connected Women&apos;s Healthcare · Indore</span>
            <h1>
              Compassionate, Connected <em>Women’s Health &amp; OB/GYN</em> Care.
            </h1>
            <p className="lead">
              GynAura bridges the gap between gynecologists and patients between clinic visits — uniting structured clinical workflows for doctors with calm, accessible care plans for women.
            </p>
            <div className="row">
              <a href="#book" className="btn">Book a Consultation <Icon d={I.arrow} size={16} /></a>
              <Link to="/login" className="btn line">Sign In</Link>
            </div>
            <div className="stats">
              <div><strong><CountUp to={4500} suffix="+" /></strong><span>Safe deliveries</span></div>
              <div><strong><CountUp to={98.6} decimals={1} suffix="%" /></strong><span>Patient satisfaction</span></div>
              <div><strong><CountUp to={15} suffix="+" /></strong><span>Years clinical depth</span></div>
              <div><strong>OTP</strong><span>Secure patient access</span></div>
            </div>
          </div>

          <div className="herocard">
            <TiltCard className="bento-hero card">
              <div className="bento-top">
                <span className="chip">Live Clinical Sync</span>
                <span className="live-tag"><i className="dot pulse" /> Indore Hub</span>
              </div>
              <div className="ring-wrap">
                <svg className="cycle-ring" viewBox="0 0 160 160">
                  <defs>
                    <linearGradient id="plumGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f7c8e5" />
                      <stop offset="55%" stopColor="#e07ab8" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                  <circle cx="80" cy="80" r="62" className="ring-bg" />
                  <circle cx="80" cy="80" r="62" className="ring-fg" stroke="url(#plumGrad)" strokeDasharray="389" strokeDashoffset={ringOffset} />
                </svg>
                <div className="ring-center">
                  <small>Trimester II</small>
                  <strong>Week <CountUp to={24} duration={900} /></strong>
                  <span>On Track</span>
                </div>
              </div>
              <div className="bento-metrics pop-z2">
                <div className="mini"><small>Assigned Plan</small><b>Glucose Screen · Due</b></div>
                <div className="mini"><small>Last Scan</small><b>Anomaly · Normal</b></div>
              </div>
              <div className="wave-strip pop-z1" aria-hidden="true">
                <svg viewBox="0 0 300 44" preserveAspectRatio="none">
                  <path className="pulse-wave" d="M0 24 L45 24 L58 24 L68 8 L78 38 L88 18 L96 24 L155 24 L168 24 L178 6 L188 40 L198 16 L206 24 L300 24" />
                </svg>
              </div>
              <div className="doc-strip pop-z3">
                <span className="logo s">✓</span>
                <div><b>Dr. Sarah Jenkins, MD · FACOG</b><small>Reviewed 14m ago · Vijay Nagar Clinic</small></div>
              </div>
            </TiltCard>
          </div>
        </div>

        <div className="wrap" style={{ paddingBottom: 24 }}>
          <div className="track card">
            <div className="trackhead">
              <b><Icon d={I.wave} size={16} /> Structured Women&apos;s Care Pathway · {stages[activeStage].name}</b>
              <span className="chip">{stages[activeStage].note}</span>
            </div>
            <div className="bar"><i style={{ width: `${stages[activeStage].pct}%` }} /></div>
            <div className="stage-tabs">
              {stages.map((s, idx) => (
                <button key={s.name} type="button" className={`stage-btn ${idx === activeStage ? 'active' : ''}`} onClick={() => setActiveStage(idx)}>
                  {idx + 1}. {s.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. SPECIALTIES */}
      <section id="specialties" className="wrap sec">
        <div className="center">
          <span className="eyebrow">Clinical Expertise</span>
          <h2>Specialized Clinical Pillars</h2>
          <p className="muted">Comprehensive obstetrics and gynecology services delivered with clinical precision, privacy, and empathy.</p>
          <div className="filter-row">
            {['All', 'Pregnancy', 'Gynecology', 'Fertility', 'Urgent'].map((c) => (
              <button key={c} type="button" className={`filter-btn ${specFilter === c ? 'on' : ''}`} onClick={() => setSpecFilter(c)}>{c}</button>
            ))}
          </div>
        </div>
        <div className="grid2-equal">
          {visiblePillars.map((p) => (
            <article key={p.t} className="card">
              <div className="card-top"><div className="ico"><Icon d={p.i} /></div><span className="chip">{p.cat}</span></div>
              <h3>{p.t}</h3>
              <p className="muted">{p.d}</p>
              <ul className="checks">{p.bullets.map((b) => <li key={b}><Icon d={I.check} size={16} />{b}</li>)}</ul>
              <a href="#book" className="link">Book {p.cat} Consultation <Icon d={I.arrow} size={14} /></a>
            </article>
          ))}
        </div>
      </section>

      {/* 3. FOR GYNECOLOGISTS */}
      <section id="for-doctors" className="wrap sec">
        <div className="center">
          <span className="eyebrow">For Gynecologists &amp; Clinics</span>
          <h2>Practice Workflows Designed Around Gynecologists</h2>
          <p className="muted">Solve follow-up drop-offs and paper record clutter first — and give every patient a seamless digital extension of your clinic.</p>
        </div>
        <div className="grid2-equal">
          {[
            { t: 'Structured OB/GYN Records', d: 'Replace scattered paper files with longitudinal antenatal, PCOS, and surgical histories in one clinical view.', i: I.clip },
            { t: 'Digital Care Plan Assignment', d: 'Assign trimester milestones, medication schedules, and scan reminders directly to your patient’s Flutter app.', i: I.cal },
            { t: 'Follow-Up & Adherence Tracking', d: 'See which patients completed scheduled labs or missed follow-ups before they fall through the cracks.', i: I.wave },
            { t: 'Clinic-First Onboarding', d: 'Built for busy Indore practices — zero complex EMR bloat, fast FastAPI backend, and OTP-verified patient linking.', i: I.shield },
          ].map((w) => (
            <article key={w.t} className="card"><div className="ico"><Icon d={w.i} /></div><h3>{w.t}</h3><p className="muted">{w.d}</p></article>
          ))}
        </div>

        <div className="card booking" style={{ marginTop: 28 }}>
          <form onSubmit={handleClinicSubmit}>
            <span className="eyebrow">Doctor Subscription · MVP Pilot</span>
            <h2>Request Clinic Onboarding</h2>
            <p className="muted">Join our initial Indore gynecologist cohort for structured patient care plans and portal access.</p>
            <div className="grid2 sm">
              <label>Doctor Name<input required value={clinic.doctor} onChange={(e) => setClinic({ ...clinic, doctor: e.target.value })} placeholder="Dr. Full Name" /></label>
              <label>Clinic / Hospital<input required value={clinic.clinicName} onChange={(e) => setClinic({ ...clinic, clinicName: e.target.value })} placeholder="Clinic name" /></label>
            </div>
            <div className="grid2 sm">
              <label>City<input required value={clinic.city} onChange={(e) => setClinic({ ...clinic, city: e.target.value })} /></label>
              <label>Mobile Number<input required value={clinic.phone} onChange={(e) => setClinic({ ...clinic, phone: e.target.value })} placeholder="10-digit mobile" maxLength={10} /></label>
            </div>
            <button className="btn full" disabled={clinicLoading}>{clinicLoading ? 'Submitting...' : 'Request Doctor Demo'}</button>
            {clinicMsg && <p className="status">{clinicMsg}</p>}
          </form>
          <aside>
            <h4>Why Doctors Start Here</h4>
            <div className="info"><Icon d={I.check} /><div><b>Zero Paper Clutter</b><small>Ultrasound &amp; lab timelines stay attached to the patient profile.</small></div></div>
            <div className="info"><Icon d={I.check} /><div><b>Higher Follow-Up Retention</b><small>Automated trimester &amp; PCOS review nudges.</small></div></div>
            <div className="info"><Icon d={I.check} /><div><b>Unified Design System</b><small>Shared FastAPI backend with the patient Flutter app.</small></div></div>
          </aside>
        </div>
      </section>

      {/* 4. DOCTORS & REVIEWS */}
      <section id="doctors" className="wrap sec">
        <div className="doctor">
          <div className="docimg">
            <Avatar big label="Dr. Sarah Jenkins" />
            <div className="badge"><b>15+</b><small>Years of clinical excellence</small></div>
          </div>
          <div>
            <span className="eyebrow">Meet Your Specialist</span>
            <h2>Dr. Sarah Jenkins, MD, FACOG</h2>
            <p className="muted">Board-certified obstetrician &amp; gynecologist with over 15 years of experience in high-risk pregnancy, minimally invasive gynecology, and adolescent health.</p>
            <p className="muted">Her practice combines clinical rigour with warmth — every patient leaves with a clear understanding of her health and a structured digital plan she is comfortable with.</p>
            <div className="grid2 sm">
              <div className="mini"><small>Education</small><b>MD, Obstetrics &amp; Gynecology</b></div>
              <div className="mini"><small>Fellowship</small><b>FACOG · High-Risk Pregnancy</b></div>
            </div>
            <div className="row">
              <a href="#book" className="btn">Schedule with Dr. Jenkins <Icon d={I.arrow} size={16} /></a>
              <a href="#for-doctors" className="btn line">Partner as a Gynecologist</a>
            </div>
          </div>
        </div>

        <div className="center" style={{ marginTop: 56 }}>
          <span className="eyebrow">Patient Experiences</span>
          <h2>Care Centered on Your Dignity</h2>
          <p className="muted">What women across Indore say about their clinical experience.</p>
        </div>
        <div className="grid3">
          {reviews.map((r) => (
            <figure key={r.n} className="card review">
              <div className="stars">{[...Array(5)].map((_, i) => <Icon key={i} d={I.star} size={14} />)}</div>
              <blockquote>&ldquo;{r.q}&rdquo;</blockquote>
              <figcaption>
                <span className="ini">{r.n[0]}</span>
                <div><b>{r.n}</b><small>{r.r}</small></div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* 6. BOOK VISIT */}
      <section id="book" className="wrap sec">
        <div className="card booking">
          <form onSubmit={handleBookingSubmit}>
            <span className="eyebrow">Appointments · Indore</span>
            <h2>Schedule Your Consultation</h2>
            <p className="muted">Share a few details and our clinic desk will confirm your appointment slot by SMS.</p>
            <label>
              Specialised consultation
              <select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
                {['Obstetrics & Antenatal Care', 'Advanced Gynecology & PCOS', 'Fertility & Hormones', '4D Ultrasound & Diagnostics', 'Urgent Gynecological Care'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <div className="grid2 sm">
              <label>Full name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" /></label>
              <label>Mobile number<input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10-digit mobile" inputMode="numeric" maxLength={10} /></label>
            </div>
            <label>Preferred date<input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
            <label>Notes (optional)<textarea rows="3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Briefly describe your concern" /></label>
            <button className="btn full" disabled={bookLoading}>{bookLoading ? 'Confirming...' : 'Confirm & Request Appointment'}</button>
            {bookStatus && <p className="status">{bookStatus}</p>}
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

      <p className="wrap disclaimer">
        Important: GynAura&apos;s AI health guidance and pregnancy-related features provide educational support only and do not replace medical diagnosis, clinical consultation, or pregnancy testing.
      </p>
    </>
  )
}
