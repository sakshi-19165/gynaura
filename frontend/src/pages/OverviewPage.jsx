import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, I } from '../components/Icons.jsx'
import { CountUp, TypeCycle, TiltCard } from '../components/Motion.jsx'

const stages = [
  { name: 'Initial Consult', pct: 20, note: 'Intake history, baseline vitals & symptom mapping' },
  { name: 'Diagnostics & Labs', pct: 40, note: 'Ultrasound, hormone panels & digital report sync' },
  { name: 'Structured Plan', pct: 60, note: 'Gynecologist-assigned care plan & trimester milestones' },
  { name: 'Active Follow-Up', pct: 80, note: 'Automated visit reminders & guided educational support' },
  { name: 'Ongoing Wellness', pct: 100, note: 'Long-term preventive screening & postnatal care' },
]

const ecosystemCards = [
  {
    eyebrow: 'Clinical Care',
    t: 'Specialized Care Pillars',
    d: 'High-risk obstetrics, PCOS & hormone management, 4D diagnostics, and urgent gynecological care.',
    to: '/specialties',
    cta: 'Explore Specialties',
    i: I.heart,
  },
  {
    eyebrow: 'For Practitioners',
    t: 'Built for Gynecologists First',
    d: 'Streamline patient histories, digital care plans, and follow-up compliance for your Indore practice.',
    to: '/for-doctors',
    cta: 'Explore Doctor Workspace',
    i: I.clip,
  },
  {
    eyebrow: 'For Patients',
    t: 'Connected Patient Portal',
    d: 'OTP-secured access to scan reports, visit schedules, and educational pregnancy & cycle guidance.',
    to: '/portal',
    cta: 'Open Patient Portal',
    i: I.shield,
  },
]

export default function OverviewPage() {
  const [activeStage, setActiveStage] = useState(2)
  const [autoPlay, setAutoPlay] = useState(true)
  const [ringOffset, setRingOffset] = useState(389)
  const current = stages[activeStage]

  useEffect(() => {
    const t = setTimeout(() => setRingOffset(115), 180)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!autoPlay) return
    const id = setInterval(() => setActiveStage((s) => (s + 1) % stages.length), 3200)
    return () => clearInterval(id)
  }, [autoPlay])

  return (
    <>
      <section className="hero-bg">
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
              GynAura bridges the gap between gynecologists and patients between clinic visits — uniting structured clinical workflows for doctors with calm, accessible care plans for women.
            </p>
            <div className="row">
              <Link to="/book" className="btn">Book a Consultation <Icon d={I.arrow} size={16} /></Link>
              <Link to="/for-doctors" className="btn line">For Gynecologists</Link>
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
                  <circle
                    cx="80"
                    cy="80"
                    r="62"
                    className="ring-fg"
                    stroke="url(#plumGrad)"
                    strokeDasharray="389"
                    strokeDashoffset={ringOffset}
                  />
                </svg>
                <div className="ring-center">
                  <small>Trimester II</small>
                  <strong>Week <CountUp to={24} duration={900} /></strong>
                  <span>On Track</span>
                </div>
              </div>

              <div className="bento-metrics pop-z2">
                <div className="mini">
                  <small>Assigned Plan</small>
                  <b>Glucose Screen · Due</b>
                </div>
                <div className="mini">
                  <small>Last Scan</small>
                  <b>Anomaly · Normal</b>
                </div>
              </div>

              <div className="wave-strip pop-z1" aria-hidden="true">
                <svg viewBox="0 0 300 44" preserveAspectRatio="none">
                  <path
                    className="pulse-wave"
                    d="M0 24 L45 24 L58 24 L68 8 L78 38 L88 18 L96 24 L155 24 L168 24 L178 6 L188 40 L198 16 L206 24 L300 24"
                  />
                </svg>
              </div>

              <div className="doc-strip pop-z3">
                <span className="logo s">✓</span>
                <div>
                  <b>Dr. Sarah Jenkins, MD · FACOG</b>
                  <small>Reviewed 14m ago · Vijay Nagar Clinic</small>
                </div>
              </div>
            </TiltCard>
          </div>
        </div>
      </section>

      <section className="wrap">
        <div className="track card">
          <div className="trackhead">
            <b><Icon d={I.wave} size={16} /> Structured Women&apos;s Care Pathway · {current.name}</b>
            <span className="chip">{current.note}</span>
          </div>
          <div className="bar"><i style={{ width: `${current.pct}%` }} /></div>
          <div className="stage-tabs">
            {stages.map((s, idx) => (
              <button
                key={s.name}
                type="button"
                className={`stage-btn ${idx === activeStage ? 'active' : ''}`}
                onClick={() => { setAutoPlay(false); setActiveStage(idx) }}
              >
                {idx + 1}. {s.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap sec">
        <div className="center">
          <span className="eyebrow">One Unified Ecosystem</span>
          <h2>Explore GynAura by Role &amp; Need</h2>
          <p className="muted">Every section of the platform is organized into a dedicated workspace — jump straight to what you need.</p>
        </div>
        <div className="grid3">
          {ecosystemCards.map((c) => (
            <article key={c.t} className="card">
              <div className="ico"><Icon d={c.i} /></div>
              <span className="eyebrow" style={{ display: 'block', marginTop: 14 }}>{c.eyebrow}</span>
              <h4>{c.t}</h4>
              <p className="muted">{c.d}</p>
              <Link to={c.to} className="link">{c.cta} <Icon d={I.arrow} size={14} /></Link>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
