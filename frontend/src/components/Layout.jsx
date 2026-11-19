import React, { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Icon, I } from './Icons.jsx'

const navItems = [
  { to: '/', label: 'Overview', end: true },
  { to: '/specialties', label: 'Specialties' },
  { to: '/for-doctors', label: 'For Gynecologists' },
  { to: '/portal', label: 'Patient' },
  { to: '/doctors', label: 'Doctors' },
]

export default function Layout({ children }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <header className="nav">
        <div className="wrap navin">
          <Link className="brand" to="/" onClick={() => setOpen(false)}>
            <span className="logo">G</span>
            GynAura <b>Health</b>
          </Link>

          <nav className="desktop-nav">
            {navItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => (isActive ? 'on' : '')}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="navcta">
            <Link to="/portal" className="ghost">OTP Sign in</Link>
            <Link to="/book" className="btn sm">Book Visit</Link>
            <button
              className="menu-btn"
              aria-label="Toggle menu"
              onClick={() => setOpen(!open)}
            >
              <Icon d={open ? I.close : I.menu} size={20} />
            </button>
          </div>
        </div>

        {open && (
          <div className="mobile-nav">
            {navItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => (isActive ? 'on' : '')}
                onClick={() => setOpen(false)}
              >
                {n.label}
              </NavLink>
            ))}
            <Link to="/book" className="btn sm" onClick={() => setOpen(false)}>Book Visit</Link>
          </div>
        )}
      </header>

      <main>{children}</main>

      <p className="wrap disclaimer">
        Important: GynAura&apos;s AI health guidance and pregnancy-related features provide educational support only and do not replace medical diagnosis, clinical consultation, or pregnancy testing.
      </p>

      <footer className="foot">
        <div className="wrap footin">
          <div>
            <Link className="brand" to="/"><span className="logo">G</span>GynAura <b>Health</b></Link>
            <p className="muted">Connected women&apos;s healthcare for gynecologists and patients. Launching in Indore, MP.</p>
          </div>
          <div>
            <h5>Platform</h5>
            <Link to="/specialties">Care Pillars</Link>
            <Link to="/for-doctors">For Gynecologists</Link>
            <Link to="/portal">Patient Portal</Link>
            <Link to="/doctors">Specialists</Link>
          </div>
          <div>
            <h5>Patients</h5>
            <Link to="/book">Book Consultation</Link>
            <Link to="/portal">OTP Portal Login</Link>
            <Link to="/specialties">Pregnancy &amp; PCOS</Link>
            <Link to="/book">Clinic Locations</Link>
          </div>
          <div>
            <h5>Clinic · Indore</h5>
            <span className="foot-txt">Vijay Nagar &amp; Super Corridor</span>
            <span className="foot-txt">Mon–Sat · 9:00 AM – 8:00 PM</span>
            <span className="foot-txt">24/7 Urgent Line Available</span>
          </div>
        </div>
        <div className="wrap copy">© {new Date().getFullYear()} GynAura HealthTech. All rights reserved.</div>
      </footer>
    </>
  )
}
