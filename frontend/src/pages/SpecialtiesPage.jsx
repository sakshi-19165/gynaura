import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, I } from '../components/Icons.jsx'

const categories = ['All', 'Pregnancy', 'Gynecology', 'Fertility', 'Urgent']

const pillars = [
  {
    cat: 'Pregnancy',
    t: 'Obstetrics & High-Risk Maternal Care',
    d: 'Complete antenatal care, trimester-wise growth scans, and delivery planning — with dedicated monitoring for gestational diabetes and hypertension.',
    bullets: ['Trimester-wise care plans', 'Gestational diabetes & BP monitoring', 'Normal & C-section deliveries', 'Postnatal & lactation support'],
    i: I.heart,
  },
  {
    cat: 'Pregnancy',
    t: '4D Ultrasound & Diagnostics',
    d: 'In-house obstetric and pelvic imaging with structured digital reports synced directly to the patient portal.',
    bullets: ['NT & anomaly scans', 'Doppler & fetal growth tracking', 'Pelvic ultrasound diagnostics', 'Instant portal report delivery'],
    i: I.wave,
  },
  {
    cat: 'Gynecology',
    t: 'Advanced Gynecology & PCOS',
    d: 'Evidence-based management for PCOS, uterine fibroids, endometriosis, and menstrual cycle irregularities.',
    bullets: ['PCOS metabolic & cycle plans', 'Minimally invasive laparoscopy', 'Endometriosis pain management', 'Annual preventive screening'],
    i: I.clip,
  },
  {
    cat: 'Fertility',
    t: 'Fertility & Hormone Care',
    d: 'Ovulation tracking, endocrine evaluation, and preconception counselling with transparent next steps.',
    bullets: ['Follicular & ovulation tracking', 'Thyroid & AMH hormone panels', 'Preconception wellness plans', 'Partner workup coordination'],
    i: I.flask,
  },
  {
    cat: 'Urgent',
    t: 'Urgent Gynecological Care',
    d: 'Same-day clinical evaluation for acute pelvic pain, abnormal bleeding, or early-pregnancy concerns.',
    bullets: ['Same-day Indore clinic slots', 'Early-pregnancy reassurance scans', 'Acute infection & pain triage', '24/7 on-call escalation'],
    i: I.shield,
  },
]

export default function SpecialtiesPage() {
  const [filter, setFilter] = useState('All')
  const visible = filter === 'All' ? pillars : pillars.filter((p) => p.cat === filter)

  return (
    <section className="wrap sec">
      <div className="center">
        <span className="eyebrow">Clinical Expertise</span>
        <h1>Specialized Clinical Pillars</h1>
        <p className="muted">Comprehensive obstetrics and gynecology services delivered with clinical precision, privacy, and empathy.</p>
        <div className="filter-row">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`filter-btn ${filter === c ? 'on' : ''}`}
              onClick={() => setFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid2-equal">
        {visible.map((p) => (
          <article key={p.t} className="card">
            <div className="card-top">
              <div className="ico"><Icon d={p.i} /></div>
              <span className="chip">{p.cat}</span>
            </div>
            <h3>{p.t}</h3>
            <p className="muted">{p.d}</p>
            <ul className="checks">
              {p.bullets.map((b) => (
                <li key={b}><Icon d={I.check} size={16} />{b}</li>
              ))}
            </ul>
            <Link to="/book" className="link">Book {p.cat} Consultation <Icon d={I.arrow} size={14} /></Link>
          </article>
        ))}
      </div>
    </section>
  )
}
