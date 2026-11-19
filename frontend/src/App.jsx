import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom'
import { TopBar } from './components/TopBar.jsx'
import LandingView from './views/LandingView.jsx'
import PatientView from './views/PatientView.jsx'
import DoctorView from './views/DoctorView.jsx'
import AdminView from './views/AdminView.jsx'
import LoginPage from './views/LoginPage.jsx'
import { getSession } from './api.js'

function RouteHelper() {
  const location = useLocation()

  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.replace('#', ''))
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname, location.hash])

  useEffect(() => {
    let io = null
    if (location.pathname === '/') {
      const targets = document.querySelectorAll('.hero > div, .herocard, .center, .card, .doctor > div, .patient-shell')
      targets.forEach((el, i) => {
        el.classList.add('reveal')
        el.style.transitionDelay = `${Math.min(i % 4, 3) * 65}ms`
      })
      io = new IntersectionObserver(
        (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }),
        { threshold: 0.08, rootMargin: '0px 0px -24px 0px' }
      )
      targets.forEach((el) => io.observe(el))
    }

    const onMove = (e) => {
      const card = e.target.closest('.card')
      if (!card) return
      const r = card.getBoundingClientRect()
      card.style.setProperty('--mx', `${e.clientX - r.left}px`)
      card.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    document.addEventListener('mousemove', onMove, { passive: true })
    return () => { if (io) io.disconnect(); document.removeEventListener('mousemove', onMove) }
  }, [location.pathname])

  return null
}

function getRoleHome(role) {
  if (role === 'admin') return '/admin'
  if (role === 'doctor') return '/doctor'
  return '/user'
}

function ProtectedRoute({ session, allowedRole, children }) {
  if (!session?.token) {
    return <Navigate to="/login" replace />
  }
  if (allowedRole && session.role !== allowedRole) {
    return <Navigate to={getRoleHome(session.role)} replace />
  }
  return children
}

export default function App() {
  const [session, setSessionState] = useState(() => getSession())

  useEffect(() => {
    const syncAuth = () => setSessionState(getSession())
    window.addEventListener('gynaura-auth', syncAuth)
    window.addEventListener('storage', syncAuth)
    return () => {
      window.removeEventListener('gynaura-auth', syncAuth)
      window.removeEventListener('storage', syncAuth)
    }
  }, [])

  return (
    <BrowserRouter>
      <RouteHelper />
      <TopBar />

      <main className="main-offset">
        <Routes>
          <Route path="/" element={<LandingView />} />
          <Route
            path="/patient"
            element={
              <ProtectedRoute session={session} allowedRole="patient">
                <PatientView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user"
            element={
              <ProtectedRoute session={session} allowedRole="patient">
                <PatientView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor"
            element={
              <ProtectedRoute session={session} allowedRole="doctor">
                <DoctorView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute session={session} allowedRole="admin">
                <AdminView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/login"
            element={
              session?.token ? (
                <Navigate to={getRoleHome(session.role)} replace />
              ) : (
                <LoginPage />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="foot">
        <div className="wrap footin">
          <div>
            <Link className="brand" to="/"><span className="logo">G</span>GynAura</Link>
            <p className="muted">Connected women&apos;s healthcare for gynecologists and patients. Launching in Indore, MP.</p>
          </div>
          <div>
            <h5>Platform</h5>
            <Link to="/#overview">Overview</Link>
            <Link to="/#specialties">Care Pillars</Link>
            <Link to="/#for-doctors">For Gynecologists</Link>
            {session?.token ? (
              <Link to={getRoleHome(session.role)}>
                {session.role === 'admin'
                  ? 'Admin Portal'
                  : session.role === 'doctor'
                    ? 'Doctor Console'
                    : 'My Health Hub'}
              </Link>
            ) : (
              <Link to="/login">Sign In</Link>
            )}
          </div>
          <div>
            <h5>Patients</h5>
            <Link to="/#book">Book Consultation</Link>
            <Link to="/login">Patient Sign In</Link>
            <Link to="/#specialties">Pregnancy &amp; PCOS</Link>
            <Link to="/#book">Clinic Locations</Link>
          </div>
          <div>
            <h5>Clinic · Indore</h5>
            <span className="foot-txt">Vijay Nagar &amp; Super Corridor</span>
            <span className="foot-txt">Mon–Sat · 9:00 AM – 8:00 PM</span>
            <span className="foot-txt">24/7 Urgent Line Available</span>
          </div>
        </div>
        <div className="wrap copy">© {new Date().getFullYear()} GynAura. All rights reserved.</div>
      </footer>
    </BrowserRouter>
  )
}
