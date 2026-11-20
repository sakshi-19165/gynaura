import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Icon, I } from '../components/Icons.jsx'
import { CountUp, TypeCycle, TiltCard } from '../components/Motion.jsx'
import { apiPost } from '../api.js'

const stages = [
  { name: 'Initial Consult', pct: 20, note: 'Intake history, baseline vitals & symptom mapping' },
  { name: 'Diagnostics & Labs', pct: 40, note: 'Ultrasound, hormone panels & digital report sync' },
  { name: 'Structured Plan', pct: 60, note: 'Personalized care plan & trimester milestones' },
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

const firstExperienceSteps = [
  {
    step: '01',
    tag: 'Step 1 · 2-Min Setup',
    moduleLabel: 'Account & Care Focus',
    title: 'Create Your Private GynAura Profile',
    desc: 'Open your private workspace, authenticate with your custom strong password or Google account, and select your primary care focus to start with a clean, unpopulated dashboard.',
    metrics: [
      { label: 'Authentication', value: 'Strong Password + Google' },
      { label: 'Care Tracks', value: 'Antenatal · PCOS · Fertility' },
      { label: 'Initial State', value: 'Clean Zero-Noise Workspace' },
      { label: 'Setup Time', value: 'Under 2 Minutes' },
    ],
    bullets: ['Zero public profile exposure', 'Clean blank-slate dashboard on sign-up'],
  },
  {
    step: '02',
    tag: 'Step 2 · Cycle & Daily Telemetry',
    moduleLabel: 'Cycle & Daily Logs',
    title: 'Log Your Cycle Baseline & Daily Symptoms',
    desc: 'Enter your last period start date and cycle length once. GynAura computes your current cycle day, 4-phase biological progression, fertile window, and daily habit adherence.',
    metrics: [
      { label: 'Cycle Engine', value: '4-Phase Biological Stepper' },
      { label: 'Fertile Window', value: 'Auto-Computed Ovulation Span' },
      { label: 'Symptom Telemetry', value: 'Flow · Pelvic Pain 0–10' },
      { label: 'Metabolic Protocol', value: '4 Daily PCOS Habits' },
    ],
    bullets: ['Live ovulation & next-period projection', 'Tabular symptom, mood & PCOS habit tracking'],
  },
  {
    step: '03',
    tag: 'Step 3 · Consults & Lab Vault',
    moduleLabel: 'Lab Vault & Consults',
    title: 'Book a Visit & Review Plain-Language Labs',
    desc: 'Request a video, audio, or Indore clinic slot in one click. When diagnostic scans or hormone panels (AMH, TSH, HbA1c, USG Pelvis) are added, read plain-language explanations side-by-side.',
    metrics: [
      { label: 'Consult Modes', value: 'Video · Audio · In-Clinic' },
      { label: 'Diagnostic Vault', value: 'USG Pelvis & Hormone Labs' },
      { label: 'Biomarker Guide', value: 'AMH · TSH · HbA1c Glossary' },
      { label: 'Report Delivery', value: 'Instant Portal Sync' },
    ],
    bullets: ['1-click consultation slot booking', 'Plain-language lab & prescription glossary'],
  },
  {
    step: '04',
    tag: 'Step 4 · Continuous Care Loop',
    moduleLabel: 'Care Plan & Overview',
    title: 'Follow Your Synced Care Plan & Daily Checklist',
    desc: 'Your care directives and daily medication reminders stay organized in structured tables—so you can check off daily tasks and monitor adherence between clinic visits.',
    metrics: [
      { label: 'Care Directives', value: 'Medication · Lifestyle · Labs' },
      { label: 'Daily Checklist', value: 'Interactive Toggle & Time' },
      { label: 'Adherence Score', value: 'Real-Time Completion %' },
      { label: 'Theme Support', value: 'Soothing Dark & Light Modes' },
    ],
    bullets: ['Structured tabular care plan directives', 'One-tap daily reminder completion'],
  },
]

export default function LandingView() {
  const [activeStage, setActiveStage] = useState(0)
  const [stageAutoPlay, setStageAutoPlay] = useState(true)
  const [ringOffset, setRingOffset] = useState(389)
  const [specFilter, setSpecFilter] = useState('All')

  // Vertical scroll-driven workflow state
  const timelineRef = useRef(null)
  const stepRefs = useRef([])
  const [scrollProgress, setScrollProgress] = useState(0.08)
  const [activeScrollStep, setActiveScrollStep] = useState(0)

  // Booking consultation state
  const [form, setForm] = useState({ name: '', phone: '', service: 'Obstetrics & Antenatal Care', date: '', notes: '' })
  const [bookStatus, setBookStatus] = useState('')
  const [bookLoading, setBookLoading] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setRingOffset(115), 180)
    return () => clearTimeout(t)
  }, [])

  // Auto-cycle top pathway stages unless paused by user
  useEffect(() => {
    if (!stageAutoPlay) return
    const id = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % stages.length)
    }, 3200)
    return () => clearInterval(id)
  }, [stageAutoPlay])

  // Drive vertical workflow dynamically as the user scrolls down the page
  useEffect(() => {
    let rafId = null

    const updateWorkflowOnScroll = () => {
      rafId = null
      const container = timelineRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const viewportTrigger = window.innerHeight * 0.62

      // Progress from top of timeline to bottom of timeline relative to trigger line
      const totalHeight = Math.max(rect.height - 80, 1)
      const rawPct = (viewportTrigger - rect.top) / totalHeight
      const clampedPct = Math.max(0.04, Math.min(1, rawPct))
      setScrollProgress(clampedPct)

      // Determine highest step whose top has crossed the viewport trigger line
      let currentIdx = 0
      stepRefs.current.forEach((el, idx) => {
        if (!el) return
        const stepRect = el.getBoundingClientRect()
        if (stepRect.top <= viewportTrigger) {
          currentIdx = idx
        }
      })
      setActiveScrollStep(currentIdx)
    }

    const onScrollOrResize = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(updateWorkflowOnScroll)
      }
    }

    updateWorkflowOnScroll()
    window.addEventListener('scroll', onScrollOrResize, { passive: true })
    window.addEventListener('resize', onScrollOrResize, { passive: true })
    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', onScrollOrResize)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [])

  const visiblePillars = specFilter === 'All' ? pillars : pillars.filter((p) => p.cat === specFilter)

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
              Compassionate, Connected{' '}
              <TypeCycle words={['Women’s Health', 'Maternal & Fetal', 'PCOS & Hormone']} />{' '}
              Care.
            </h1>
            <p className="lead">
              GynAura supports your health journey between clinic visits — uniting personalized cycle tracking, diagnostic reports, and calm, accessible care plans for women.
            </p>
            <div className="row">
              <Link to="/user" className="btn">Try the App <Icon d={I.arrow} size={16} /></Link>
              <a href="#book" className="btn line">Book a Consultation</a>
            </div>
            <div className="stats">
              <div><strong><CountUp to={4500} suffix="+" /></strong><span>Safe deliveries</span></div>
              <div><strong><CountUp to={98.6} decimals={1} suffix="%" /></strong><span>Patient satisfaction</span></div>
              <div><strong><CountUp to={15} suffix="+" /></strong><span>Years clinical depth</span></div>
              <div><strong>24/7</strong><span>Connected care hub</span></div>
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
                <div><b>GynAura Care Hub</b><small>Live Care Sync · Indore Wellness Network</small></div>
              </div>
            </TiltCard>
          </div>
        </div>

        <div className="wrap" style={{ paddingBottom: 24 }}>
          <div
            className="track card"
            onMouseEnter={() => setStageAutoPlay(false)}
            onMouseLeave={() => setStageAutoPlay(true)}
          >
            <div className="trackhead">
              <b><Icon d={I.wave} size={16} /> Structured Women&apos;s Care Pathway · {stages[activeStage].name}</b>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="chip">{stages[activeStage].note}</span>
                <button
                  type="button"
                  className="ws-btn"
                  style={{ height: 26, padding: '0 9px', fontSize: '.72rem' }}
                  onClick={() => setStageAutoPlay((prev) => !prev)}
                >
                  {stageAutoPlay ? 'Pause' : 'Play'}
                </button>
              </div>
            </div>
            <div className="bar"><i style={{ width: `${stages[activeStage].pct}%` }} /></div>
            <div className="stage-tabs">
              {stages.map((s, idx) => (
                <button
                  key={s.name}
                  type="button"
                  className={`stage-btn ${idx === activeStage ? 'active' : ''}`}
                  onClick={() => {
                    setActiveStage(idx)
                    setStageAutoPlay(false)
                  }}
                >
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

      {/* 3. SCROLL-DRIVEN VERTICAL USER WORKFLOW OF FIRST EXPERIENCE */}
      <section id="how-it-works" className="wrap sec">
        <div className="center">
          <span className="eyebrow">Your First Experience · Step-by-Step Journey</span>
          <h2>How Your GynAura Journey Unfolds</h2>
          <p className="muted">Scroll down to follow each stage of your first experience inside the GynAura workspace.</p>
        </div>

        <div className="vflow-timeline" ref={timelineRef}>
          {/* Continuous Vertical Scroll Spine */}
          <div className="vflow-spine" aria-hidden="true">
            <div
              className="vflow-spine-fill"
              style={{ transform: `scaleY(${scrollProgress})` }}
            />
          </div>

          {firstExperienceSteps.map((item, idx) => {
            const isReached = idx <= activeScrollStep
            const isCurrent = idx === activeScrollStep
            const isCompleted = idx < activeScrollStep
            return (
              <div
                key={item.step}
                ref={(el) => {
                  stepRefs.current[idx] = el
                }}
                className={`vflow-step-row${isReached ? ' is-reached' : ''}${isCurrent ? ' is-current' : ''}`}
              >
                <div className="vflow-step-marker" aria-hidden="true">
                  <div className="vflow-node">
                    {isCompleted ? '✓' : item.step}
                  </div>
                </div>

                <article className="card vflow-step-card">
                  <div className="vflow-stage-top">
                    <span className="pill">
                      <i className={`dot${isCurrent ? ' pulse' : ''}`} /> {item.tag}
                    </span>
                    <span className="chip">{item.moduleLabel}</span>
                  </div>

                  <div className="vflow-card-main">
                    <h3>{item.step}. {item.title}</h3>
                    <p className="muted">{item.desc}</p>
                  </div>

                  <div className="vflow-preview-grid">
                    {item.metrics.map((m) => (
                      <div key={m.label} className="vflow-preview-cell">
                        <small>{m.label}</small>
                        <strong>{m.value}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="vflow-stage-foot">
                    <ul className="checks" style={{ margin: 0 }}>
                      {item.bullets.map((b) => (
                        <li key={b}><Icon d={I.check} size={16} />{b}</li>
                      ))}
                    </ul>
                    <Link to="/user" className="btn line sm">
                      Open in App <Icon d={I.arrow} size={14} />
                    </Link>
                  </div>
                </article>
              </div>
            )
          })}
        </div>
      </section>

      {/* 4. BOOK VISIT */}
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
