import React from 'react'
import { Link } from 'react-router-dom'
import { Icon, I, Avatar } from '../components/Icons.jsx'

const reviews = [
  { n: 'Priya Sharma', r: 'Antenatal patient · Indore', q: 'Every visit felt calm and unhurried. Having ultrasound reports on my phone saved so many trips.' },
  { n: 'Neha Verma', r: 'PCOS care · Vijay Nagar', q: 'Finally a doctor who explained everything clearly. Follow-ups and lab timelines were completely organized.' },
  { n: 'Ritu Jain', r: 'Fertility care · Indore', q: 'Respectful, private, and evidence-based. I always knew what the next step in my care plan was.' },
]

export default function DoctorsPage() {
  return (
    <>
      <section className="wrap sec doctor">
        <div className="docimg">
          <Avatar big label="Dr. Sarah Jenkins" />
          <div className="badge"><b>15+</b><small>Years of clinical excellence</small></div>
        </div>
        <div>
          <span className="eyebrow">Meet Your Specialist</span>
          <h1>Dr. Sarah Jenkins, MD, FACOG</h1>
          <p className="muted">Board-certified obstetrician &amp; gynecologist with over 15 years of experience in high-risk pregnancy, minimally invasive gynecology, and adolescent health.</p>
          <p className="muted">Her practice combines clinical rigour with warmth — every patient leaves with a clear understanding of her health and a structured digital plan she is comfortable with.</p>
          <div className="grid2 sm">
            <div className="mini"><small>Education</small><b>MD, Obstetrics &amp; Gynecology</b></div>
            <div className="mini"><small>Fellowship</small><b>FACOG · High-Risk Pregnancy</b></div>
          </div>
          <div className="row">
            <Link to="/book" className="btn">Schedule with Dr. Jenkins <Icon d={I.arrow} size={16} /></Link>
            <Link to="/for-doctors" className="btn line">Partner as a Gynecologist</Link>
          </div>
        </div>
      </section>

      <section className="wrap sec" style={{ paddingTop: 16 }}>
        <div className="center">
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
    </>
  )
}
