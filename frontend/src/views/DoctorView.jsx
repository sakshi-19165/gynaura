import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiGet, apiPost, apiPatch, apiDelete, getSession, setSession, clearSession } from '../api.js'
import { Icon, I } from '../components/Icons.jsx'

function getTimeGreeting() {
  const hr = new Date().getHours()
  if (hr < 12) return 'Good morning'
  if (hr < 17) return 'Good afternoon'
  return 'Good evening'
}

function getInitials(name = '') {
  const clean = String(name).replace(/^Dr\.?\s*/i, '').trim()
  const parts = clean.split(/\s+/).filter(Boolean)
  if (!parts.length) return 'DR'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function computeCycleDay(lastPeriod, cycleLength = 28) {
  if (!lastPeriod) return '—'
  const start = new Date(lastPeriod)
  if (Number.isNaN(start.getTime())) return '—'
  const today = new Date()
  const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'Day 1'
  const len = Number(cycleLength) > 0 ? Number(cycleLength) : 28
  return `Day ${(diffDays % len) + 1}`
}

function formatPcosHabits(habits) {
  if (Array.isArray(habits)) {
    return habits.length > 0 ? habits.join(' · ') : 'No PCOS habit logs recorded.'
  }
  if (habits && typeof habits === 'object') {
    return `Sleep: ${habits.sleep_hours ?? '—'}h · Steps: ${habits.steps ?? '—'} · Water: ${habits.water_liters ?? '—'}L · Stress: ${habits.stress_level ?? '—'}/10`
  }
  return 'No PCOS habit logs recorded.'
}

function hasPcosHabits(habits) {
  if (Array.isArray(habits)) return habits.length > 0
  return Boolean(habits && typeof habits === 'object' && Object.keys(habits).length > 0)
}

const VIEW_LABELS = {
  roster: 'Patient Roster',
  vitals: 'Clinical Vitals & Logs',
  careplans: 'Care Plans & Rx',
  reports: 'Lab & Scan Reports',
  appointments: 'Appointments Queue',
  account: 'Doctor Account',
}

const PATIENT_SCOPED_VIEWS = new Set(['vitals', 'careplans', 'reports'])

export default function DoctorView() {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [theme, setTheme] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('gynaura_theme') : null
    return saved === 'light' ? 'light' : 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('gynaura_theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))

  const handleLogout = () => {
    apiPost('/auth/logout', {}).catch(() => {})
    clearSession()
    navigate('/login')
  }

  // Sidebar navigation view
  const [activeView, setActiveView] = useState('roster')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const selectDoctorView = (id) => {
    setActiveView(id)
    setSidebarOpen(false)
  }

  // Patient roster & selection
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [selectedPatientId, setSelectedPatientId] = useState(null)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [patientLoading, setPatientLoading] = useState(false)

  // Care plan form & drawer
  const [showCarePlanDrawer, setShowCarePlanDrawer] = useState(false)
  const [cpTitle, setCpTitle] = useState('')
  const [cpCategory, setCpCategory] = useState('Medication')
  const [cpFrequency, setCpFrequency] = useState('Once daily')
  const [cpNotes, setCpNotes] = useState('')
  const [cpStatus, setCpStatus] = useState('')

  // Report form & drawer
  const [showReportDrawer, setShowReportDrawer] = useState(false)
  const [repTitle, setRepTitle] = useState('')
  const [repStatus, setRepStatus] = useState('Normal')
  const [repSummary, setRepSummary] = useState('')
  const [repPlain, setRepPlain] = useState('')
  const [repMsg, setRepMsg] = useState('')

  // Appointments action feedback
  const [apptMsg, setApptMsg] = useState('')

  // Add Patient Form State
  const [showAddPatient, setShowAddPatient] = useState(false)
  const [newPatientName, setNewPatientName] = useState('')
  const [newPatientPhone, setNewPatientPhone] = useState('')
  const [newPatientAge, setNewPatientAge] = useState('28')
  const [newPatientTag, setNewPatientTag] = useState('Antenatal')
  const [newPatientSummary, setNewPatientSummary] = useState('')
  const [addPatientError, setAddPatientError] = useState('')
  const [addPatientLoading, setAddPatientLoading] = useState(false)

  // Doctor Account Edit State
  const [docName, setDocName] = useState('')
  const [docSpecialty, setDocSpecialty] = useState('')
  const [docPhone, setDocPhone] = useState('')
  const [docClinics, setDocClinics] = useState('')
  const [docSaving, setDocSaving] = useState(false)
  const [docMsg, setDocMsg] = useState('')
  const [docErr, setDocErr] = useState('')

  const loadPatient = async (patientId) => {
    if (!patientId) return
    try {
      setPatientLoading(true)
      const res = await apiGet(`/doctor/patients/${patientId}`)
      setSelectedPatient(res)
    } catch (err) {
      console.error(err)
    } finally {
      setPatientLoading(false)
    }
  }

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const res = await apiGet('/doctor/dashboard')
      setDashboard(res)
      setError('')
      if (res?.patients?.length > 0 && !selectedPatientId) {
        setSelectedPatientId(res.patients[0].id)
      }
    } catch (err) {
      setError(err.message || 'Failed to load doctor dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    await loadDashboard()
    if (selectedPatientId) {
      await loadPatient(selectedPatientId)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  useEffect(() => {
    if (!selectedPatientId) return
    loadPatient(selectedPatientId)
  }, [selectedPatientId])

  useEffect(() => {
    const doc = dashboard?.doctor || getSession()?.user || {}
    setDocName(doc.name || 'Dr. Sarah Jenkins, MD, FACOG')
    setDocSpecialty(doc.specialty || '')
    setDocPhone(doc.phone || '')
    setDocClinics(
      Array.isArray(doc.clinics)
        ? doc.clinics.join(', ')
        : (doc.clinic || '')
    )
  }, [dashboard?.doctor])

  const handleCreateCarePlan = async (e) => {
    e.preventDefault()
    if (!selectedPatient) return
    try {
      setCpStatus('Syncing care plan...')
      const res = await apiPost(`/doctor/patients/${selectedPatient.id}/care-plan`, {
        title: cpTitle,
        category: cpCategory,
        frequency: cpFrequency,
        notes: cpNotes,
      })
      setSelectedPatient({
        ...selectedPatient,
        care_plans: res.care_plans,
        reminders: res.reminders,
      })
      setCpStatus('Care plan synced to patient portal.')
      setCpTitle('')
      setCpNotes('')
      setShowCarePlanDrawer(false)
      setTimeout(() => setCpStatus(''), 4000)
    } catch (err) {
      setCpStatus(err.message || 'Failed to add care plan')
    }
  }

  const handlePublishReport = async (e) => {
    e.preventDefault()
    if (!selectedPatient) return
    try {
      setRepMsg('Publishing report...')
      const res = await apiPost(`/doctor/patients/${selectedPatient.id}/reports`, {
        title: repTitle,
        status: repStatus,
        summary: repSummary,
        plain_explanation: repPlain,
      })
      setSelectedPatient({
        ...selectedPatient,
        reports: res.reports,
      })
      setRepMsg('Report published to patient portal.')
      setRepTitle('')
      setRepSummary('')
      setRepPlain('')
      setShowReportDrawer(false)
      setTimeout(() => setRepMsg(''), 4000)
    } catch (err) {
      setRepMsg(err.message || 'Failed to publish report')
    }
  }

  const handleUpdateApptStatus = async (apptId, status) => {
    try {
      setApptMsg(`Updating appointment to ${status}...`)
      await apiPatch(`/doctor/appointments/${apptId}`, { status })
      await loadDashboard()
      setApptMsg(`Appointment marked ${status}.`)
      setTimeout(() => setApptMsg(''), 3000)
    } catch (err) {
      setApptMsg(err.message || 'Failed to update appointment')
    }
  }

  const handleAddPatient = async (e) => {
    e.preventDefault()
    if (!newPatientName.trim() || !newPatientPhone.trim()) {
      setAddPatientError('Name and phone are required.')
      return
    }
    try {
      setAddPatientLoading(true)
      setAddPatientError('')
      const raw = newPatientPhone.trim()
      const digits = raw.replace(/\D/g, '')
      const targetPhone = raw.startsWith('+') ? ('+' + digits) : digits
      const res = await apiPost('/doctor/patients', {
        name: newPatientName.trim(),
        phone: targetPhone,
        age: Number(newPatientAge) || 28,
        tag: newPatientTag,
        summary: newPatientSummary.trim() || 'New Indore patient',
        high_priority: newPatientTag === 'High-Risk',
      })
      setNewPatientName('')
      setNewPatientPhone('')
      setNewPatientAge('28')
      setNewPatientTag('Antenatal')
      setNewPatientSummary('')
      setShowAddPatient(false)
      await loadDashboard()
      if (res?.patient?.id) {
        setSelectedPatientId(res.patient.id)
      }
    } catch (err) {
      setAddPatientError(err.message || 'Failed to create patient')
    } finally {
      setAddPatientLoading(false)
    }
  }

  const handleDeleteCarePlan = async (carePlanId) => {
    if (!selectedPatient) return
    try {
      const res = await apiDelete(`/doctor/patients/${selectedPatient.id}/care-plan/${carePlanId}`)
      setSelectedPatient((prev) => (prev ? { ...prev, care_plans: res.care_plans } : prev))
    } catch (err) {
      console.error('Failed to remove care plan', err)
    }
  }

  const handleSaveDoctorAccount = async (e) => {
    e.preventDefault()
    try {
      setDocSaving(true)
      setDocErr('')
      setDocMsg('')
      const clinicsArr = docClinics
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
      const res = await apiPatch('/auth/profile', {
        name: docName.trim(),
        specialty: docSpecialty.trim(),
        phone: docPhone.trim(),
        clinics: clinicsArr,
      })
      if (res?.user) {
        setDashboard((prev) => (prev ? { ...prev, doctor: res.user } : prev))
        const currentSession = getSession()
        if (currentSession) {
          setSession({ ...currentSession, user: res.user })
        }
      }
      setDocMsg('Profile updated')
      setTimeout(() => setDocMsg(''), 4000)
    } catch (err) {
      setDocErr(err.message || 'Failed to update account')
    } finally {
      setDocSaving(false)
    }
  }

  if (loading && !dashboard) {
    return (
      <div className="ws-wrap">
        <div className="surface surface-pad">
          <div className="ws-title">Loading Gynecologist Console...</div>
          <div className="ws-sub">Connecting to GynAura Indore clinical server.</div>
        </div>
      </div>
    )
  }

  if (error && !dashboard) {
    return (
      <div className="ws-wrap">
        <div className="surface surface-pad">
          <div className="ws-title">Unable to Connect</div>
          <div className="ws-sub">{error}</div>
          <div style={{ marginTop: 12 }}>
            <button type="button" className="ws-btn pri" onClick={loadDashboard}>Retry Connection</button>
          </div>
        </div>
      </div>
    )
  }

  const kpis = dashboard?.kpis || { total_patients: 0, upcoming_appointments: 0, high_priority: 0, avg_adherence: 0 }
  const patientsList = dashboard?.patients || []
  const appointmentsList = dashboard?.appointments || []
  const doctorInfo = dashboard?.doctor || { name: 'Dr. Sarah Jenkins, MD, FACOG', clinic: 'Vijay Nagar & Super Corridor · Indore' }
  const doctorClinicsText = Array.isArray(doctorInfo.clinics) && doctorInfo.clinics.length > 0
    ? doctorInfo.clinics.join(' · ')
    : (doctorInfo.clinic || 'GynAura Gynecologist Console · Indore')

  const filteredPatients = patientsList.filter((p) => {
    const q = search.trim().toLowerCase()
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.summary && p.summary.toLowerCase().includes(q)) ||
      (p.tag && p.tag.toLowerCase().includes(q)) ||
      (p.phone && p.phone.toLowerCase().includes(q))
    if (categoryFilter === 'All') return matchesSearch
    if (categoryFilter === 'High-Risk') return matchesSearch && Boolean(p.high_priority)
    return matchesSearch && p.tag === categoryFilter
  })

  const cycleLengthVal = Number(selectedPatient?.cycle?.cycle_length) || 28
  const cycleDay = computeCycleDay(selectedPatient?.cycle?.last_period, selectedPatient?.cycle?.cycle_length)

  const telemetryRows = [
    ...(selectedPatient?.mood_logs || []).map((m, idx) => ({
      id: m.id || `mood-${idx}`,
      timestamp: m.timestamp || '—',
      type: 'Mood',
      primary: `${m.mood || '—'}${m.energy ? ` (${m.energy}/10)` : ''}`,
      details: m.note || '—',
    })),
    ...(selectedPatient?.symptom_logs || []).map((s, idx) => ({
      id: s.id || `sym-${idx}`,
      timestamp: s.timestamp || '—',
      type: 'Symptom',
      primary: `${s.flow || 'None'} · Pain ${s.pain ?? 0}/10`,
      details: Array.isArray(s.symptoms) && s.symptoms.length > 0 ? s.symptoms.join(', ') : 'No symptoms specified',
    })),
  ].sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))

  const navItems = [
    { id: 'roster', label: 'Patient Roster', sub: 'Search & triage charts', shortLabel: 'Roster', badge: patientsList.length, icon: I.user },
    { id: 'vitals', label: 'Clinical Vitals & Logs', sub: 'Cycle, pain & mood', shortLabel: 'Vitals', badge: null, icon: I.wave },
    { id: 'careplans', label: 'Care Plans & Rx', sub: 'Assign orders & tasks', shortLabel: 'Orders', badge: selectedPatient?.care_plans?.length || 0, icon: I.heart },
    { id: 'reports', label: 'Lab & Scan Reports', sub: 'Publish diagnostics', shortLabel: 'Reports', badge: selectedPatient?.reports?.length || 0, icon: I.flask },
    { id: 'appointments', label: 'Appointments Queue', sub: 'Confirm & complete visits', shortLabel: 'Queue', badge: kpis.upcoming_appointments, icon: I.cal },
  ]

  const currentViewLabel = VIEW_LABELS[activeView] || 'Patient Roster'
  const showPatientBreadcrumb = PATIENT_SCOPED_VIEWS.has(activeView) && selectedPatient
  const doctorDisplayName = doctorInfo.name || 'Dr. Sarah Jenkins, MD, FACOG'
  const greeting = getTimeGreeting()

  return (
    <div className="webapp-shell ws-wrap" style={{ maxWidth: 'none', margin: 0, padding: 0 }}>
      <div
        className={`webapp-backdrop${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Left App Sidebar */}
      <aside className={`webapp-sidebar${sidebarOpen ? ' open' : ''}`} aria-label="Doctor Workspace Sidebar">
        <div>
          {/* App Brand + Main Website Link */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 10px 12px',
              borderBottom: '1px solid var(--line)',
              marginBottom: 10,
              gap: 8,
            }}
          >
            <Link to="/doctor" className="brand" style={{ fontSize: '.95rem' }} onClick={() => setSidebarOpen(false)}>
              <span className="logo" style={{ width: 24, height: 24, fontSize: '.78rem' }}>
                G
              </span>
              GynAura MD
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link
                to="/"
                className="ws-btn"
                style={{ height: 26, padding: '0 8px', fontSize: '.72rem' }}
                title="Back to main GynAura website"
              >
                Website ↗
              </Link>
              <button
                type="button"
                className="ws-btn sidebar-close-btn"
                style={{ height: 26, padding: '0 8px' }}
                onClick={() => setSidebarOpen(false)}
                aria-label="Close navigation drawer"
              >
                <Icon d={I.close} size={15} />
              </button>
            </div>
          </div>

          <div className="sidebar-profile">
            <div className="sidebar-avatar" aria-hidden="true">
              {getInitials(doctorDisplayName)}
              <span className="sidebar-avatar-dot" />
            </div>
            <div className="sidebar-profile-meta">
              <div className="sidebar-profile-name">{doctorDisplayName}</div>
              <div className="sidebar-profile-sub">
                <span>{doctorInfo.specialty || 'Obstetrics & Gynecology'}</span>
              </div>
            </div>
          </div>

          <div className="sidebar-group-lbl">
            <span>Clinical Workspace</span>
            <span>5 views</span>
          </div>
          <nav className="sidebar-nav" aria-label="Doctor Workspace Views">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`sidebar-link ${activeView === item.id ? 'on' : ''}`}
                aria-current={activeView === item.id ? 'page' : undefined}
                onClick={() => selectDoctorView(item.id)}
              >
                <span className="sidebar-link-main">
                  <span className="sidebar-ico-box">
                    <Icon d={item.icon} size={14} />
                  </span>
                  <span>{item.label}</span>
                </span>
                {item.badge !== null && (
                  <span className="sidebar-count">{item.badge}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Useful Panel 1: Practice Telemetry */}
          <div className="sidebar-widget" aria-label="Practice telemetry">
            <div className="sidebar-widget-head">
              <span className="sidebar-widget-lbl">Practice Pulse</span>
              <span className="badge-ok">{kpis.avg_adherence}% Adherence</span>
            </div>
            <div className="sidebar-mini-grid">
              <div className="sidebar-mini-stat">
                <small>High-Risk</small>
                <strong>{kpis.high_priority} Alerts</strong>
              </div>
              <div className="sidebar-mini-stat">
                <small>Upcoming</small>
                <strong>{kpis.upcoming_appointments} Visits</strong>
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>
          <div className="sidebar-group-lbl" style={{ paddingTop: 0 }}>
            <span>Active Patient Chart</span>
          </div>
          <div style={{ padding: '0 4px 8px' }}>
            <select
              className="ws-select"
              style={{ width: '100%' }}
              aria-label="Select Active Patient"
              value={selectedPatientId || ''}
              onChange={(e) => setSelectedPatientId(e.target.value)}
            >
              {patientsList.length === 0 ? (
                <option value="">No patients</option>
              ) : (
                patientsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.tag || 'General'})
                  </option>
                ))
              )}
            </select>

            {selectedPatient && (
              <div className="sidebar-widget" style={{ marginTop: 6 }}>
                <div className="sidebar-widget-head">
                  <span className="sidebar-widget-title">
                    {selectedPatient.high_priority && <span className="priority-dot" title="High Priority" />}
                    {selectedPatient.name}
                  </span>
                  <span className="badge-plum">{selectedPatient.tag || 'General'}</span>
                </div>
                <div className="sidebar-kv-list">
                  <div className="sidebar-kv">
                    <span>Cycle Day</span>
                    <strong>{cycleDay}</strong>
                  </div>
                  <div className="sidebar-kv">
                    <span>Adherence</span>
                    <strong>{selectedPatient.adherence ?? 100}%</strong>
                  </div>
                  <div className="sidebar-kv">
                    <span>Active Orders</span>
                    <strong>{selectedPatient.care_plans?.length || 0} directives</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          <nav className="sidebar-nav" aria-label="Doctor account and session" style={{ borderTop: '1px solid var(--line)', paddingTop: 6 }}>
            <button
              type="button"
              className={`sidebar-link ${activeView === 'account' ? 'on' : ''}`}
              aria-current={activeView === 'account' ? 'page' : undefined}
              onClick={() => selectDoctorView('account')}
            >
              <span className="sidebar-link-main">
                <span className="sidebar-ico-box">
                  <Icon d={I.shield} size={14} />
                </span>
                <span>Doctor Account</span>
              </span>
            </button>
            <button
              type="button"
              className="sidebar-link"
              onClick={handleLogout}
            >
              <span className="sidebar-link-main">
                <span className="sidebar-ico-box">
                  <Icon d={I.close} size={14} />
                </span>
                <span>Sign Out</span>
              </span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Pane */}
      <div className="webapp-main">
        {/* Top Sub-Toolbar */}
        <header className="webapp-toolbar">
          <div className="webapp-toolbar-left">
            <button
              type="button"
              className="ws-btn mobile-menu-trigger"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={sidebarOpen}
            >
              <Icon d={I.menu} size={16} />
            </button>
            <div className="webapp-breadcrumb">
              <span>{greeting},</span>
              <strong>{doctorDisplayName}</strong>
              <span>·</span>
              <span>{currentViewLabel}</span>
              {showPatientBreadcrumb && (
                <span>
                  ({selectedPatient.name} · {selectedPatient.tag || 'General'})
                </span>
              )}
            </div>
          </div>

          <div className="ws-actions">
            {docMsg && <span className="badge-ok" role="status" aria-live="polite">{docMsg}</span>}
            {apptMsg && <span className="badge-ok" role="status" aria-live="polite">{apptMsg}</span>}

            <button
              type="button"
              className="ws-btn"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
            >
              {theme === 'dark' ? '☀ Light' : '☾ Dark'}
            </button>

            <button
              type="button"
              className="ws-btn"
              onClick={handleRefresh}
            >
              Sync Roster
            </button>

            {activeView === 'roster' && (
              <button
                type="button"
                className="ws-btn pri"
                onClick={() => setShowAddPatient((v) => !v)}
              >
                {showAddPatient ? 'Cancel' : '+ Add Patient'}
              </button>
            )}

            {activeView === 'careplans' && (
              <button
                type="button"
                className="ws-btn pri"
                disabled={!selectedPatient}
                onClick={() => setShowCarePlanDrawer((v) => !v)}
              >
                {showCarePlanDrawer ? 'Cancel' : '+ Assign Order'}
              </button>
            )}

            {activeView === 'reports' && (
              <button
                type="button"
                className="ws-btn pri"
                disabled={!selectedPatient}
                onClick={() => setShowReportDrawer((v) => !v)}
              >
                {showReportDrawer ? 'Cancel' : '+ Publish Report'}
              </button>
            )}

            <button
              type="button"
              className="ws-btn"
              onClick={handleLogout}
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="webapp-content">
          {/* VIEW 1: PATIENT ROSTER */}
          {activeView === 'roster' && (
            <>
              <div className="view-head">
                <div>
                  <h1>{greeting}, {doctorDisplayName}</h1>
                  <p>{doctorClinicsText} · Connected OB-GYN Patient Roster &amp; Telemetry</p>
                </div>
              </div>
              <div className="seg-kpis">
                <div className="seg-kpi">
                  <span className="seg-kpi-lbl">Active Patients</span>
                  <strong>{kpis.total_patients}</strong>
                </div>
                <div className="seg-kpi">
                  <span className="seg-kpi-lbl">Upcoming Appointments</span>
                  <strong>{kpis.upcoming_appointments}</strong>
                </div>
                <div className="seg-kpi">
                  <span className="seg-kpi-lbl">High-Risk Alerts</span>
                  <strong>{kpis.high_priority}</strong>
                </div>
                <div className="seg-kpi">
                  <span className="seg-kpi-lbl">Avg Adherence</span>
                  <strong>{kpis.avg_adherence}%</strong>
                </div>
              </div>

              {showAddPatient && (
                <form className="app-drawer" onSubmit={handleAddPatient}>
                  <div className="sec-lbl" style={{ marginBottom: 10 }}>
                    <span>Register New Patient</span>
                  </div>
                  {addPatientError && (
                    <div className="badge-warn" style={{ marginBottom: 10, height: 'auto', padding: '5px 8px' }}>
                      {addPatientError}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                    <div className="field-group">
                      <label htmlFor="new-pat-name">Full Name</label>
                      <input
                        id="new-pat-name"
                        type="text"
                        placeholder="Full Name"
                        value={newPatientName}
                        onChange={(e) => setNewPatientName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="new-pat-phone">Phone</label>
                      <input
                        id="new-pat-phone"
                        type="tel"
                        inputMode="tel"
                        maxLength={14}
                        placeholder="10-digit Phone"
                        value={newPatientPhone}
                        onChange={(e) => setNewPatientPhone(e.target.value)}
                        required
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="new-pat-age">Age</label>
                      <input
                        id="new-pat-age"
                        type="number"
                        min={12}
                        max={100}
                        placeholder="Age"
                        value={newPatientAge}
                        onChange={(e) => setNewPatientAge(e.target.value)}
                        required
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="new-pat-tag">Category</label>
                      <select
                        id="new-pat-tag"
                        value={newPatientTag}
                        onChange={(e) => setNewPatientTag(e.target.value)}
                      >
                        <option value="Antenatal">Antenatal</option>
                        <option value="PCOS">PCOS</option>
                        <option value="Fertility">Fertility</option>
                        <option value="High-Risk">High-Risk</option>
                      </select>
                    </div>
                  </div>
                  <div className="field-group">
                    <label htmlFor="new-pat-summary">Clinical Summary (optional)</label>
                    <input
                      id="new-pat-summary"
                      type="text"
                      placeholder="e.g. Week 18 · Routine Antenatal"
                      value={newPatientSummary}
                      onChange={(e) => setNewPatientSummary(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" className="ws-btn pri" disabled={addPatientLoading}>
                      {addPatientLoading ? 'Saving...' : 'Save Patient'}
                    </button>
                    <button type="button" className="ws-btn" onClick={() => setShowAddPatient(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="table-wrap" tabIndex={0} role="region" aria-label="Patient Roster">
                <div className="table-bar">
                  <input
                    type="search"
                    className="roster-search"
                    style={{ maxWidth: 280 }}
                    aria-label="Search patients by name, tag, or phone"
                    placeholder="Search patient, tag, phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <div className="pill-row" style={{ marginTop: 0 }}>
                    {['All', 'Antenatal', 'PCOS', 'Fertility', 'High-Risk'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        aria-pressed={categoryFilter === cat}
                        className={`mini-pill ${categoryFilter === cat ? 'on' : ''}`}
                        onClick={() => setCategoryFilter(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <table className="data-table">
                  <caption>Patient Roster</caption>
                  <thead>
                    <tr>
                      <th scope="col">Patient</th>
                      <th scope="col">Age / Phone</th>
                      <th scope="col">Category</th>
                      <th scope="col">Clinical Summary</th>
                      <th scope="col" className="num">Adherence</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="table-empty">
                          No matching patients found.
                        </td>
                      </tr>
                    ) : (
                      filteredPatients.map((p) => (
                        <tr key={p.id}>
                          <td data-label="Patient">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                              {p.high_priority && <span className="priority-dot" title="High Priority" />}
                              <span>{p.name}</span>
                            </div>
                          </td>
                          <td data-label="Age / Phone">
                            <div>{p.age ? `${p.age} yrs` : '—'}</div>
                            <div className="ws-sub">{p.phone || '—'}</div>
                          </td>
                          <td data-label="Category">
                            <span className={p.high_priority ? 'badge-warn' : 'badge-plum'}>
                              {p.tag || 'General'}
                            </span>
                          </td>
                          <td data-label="Summary">{p.summary || '—'}</td>
                          <td data-label="Adherence" className="num">
                            <strong>{p.adherence ?? 0}%</strong>
                          </td>
                          <td data-label="Actions">
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="ws-btn pri"
                                onClick={() => {
                                  setSelectedPatientId(p.id)
                                  setActiveView('vitals')
                                }}
                              >
                                Open Chart
                              </button>
                              <button
                                type="button"
                                className="ws-btn"
                                onClick={() => {
                                  setSelectedPatientId(p.id)
                                  setActiveView('careplans')
                                }}
                              >
                                Care Plans
                              </button>
                              <button
                                type="button"
                                className="ws-btn"
                                onClick={() => {
                                  setSelectedPatientId(p.id)
                                  setActiveView('reports')
                                }}
                              >
                                Reports
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* VIEW 2: CLINICAL VITALS & LOGS */}
          {activeView === 'vitals' && (
            !selectedPatient ? (
              <div className="table-wrap">
                <div className="table-empty">
                  {patientLoading ? 'Loading patient chart...' : 'Select a patient from the sidebar or Patient Roster.'}
                </div>
              </div>
            ) : (
              <>
                <div className="table-wrap">
                  <div className="table-bar">
                    <div className="sec-lbl" style={{ margin: 0 }}>
                      Cycle &amp; Endocrine Vitals — {selectedPatient.name}
                    </div>
                    <span className="ws-sub">{selectedPatient.summary || 'Clinical Telemetry'}</span>
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Parameter</th>
                        <th>Current Reading</th>
                        <th>Reference / Target</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Menstrual Cycle Day</strong></td>
                        <td>{cycleDay}</td>
                        <td>Day 1–{cycleLengthVal} (Phase-adjusted)</td>
                        <td>
                          <span className={cycleDay === '—' ? 'badge-warn' : 'badge-plum'}>
                            {cycleDay === '—' ? 'Unrecorded' : 'Active Tracking'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Last Period Start</strong></td>
                        <td>{selectedPatient.cycle?.last_period || '—'}</td>
                        <td>YYYY-MM-DD (LMP)</td>
                        <td>
                          <span className={selectedPatient.cycle?.last_period ? 'badge-ok' : 'badge-warn'}>
                            {selectedPatient.cycle?.last_period ? 'Recorded' : 'Missing'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Cycle Length</strong></td>
                        <td>{selectedPatient.cycle?.cycle_length ? `${selectedPatient.cycle.cycle_length} days` : '—'}</td>
                        <td>21–35 days (Standard Range)</td>
                        <td>
                          <span className={cycleLengthVal >= 21 && cycleLengthVal <= 35 ? 'badge-ok' : 'badge-warn'}>
                            {cycleLengthVal >= 21 && cycleLengthVal <= 35 ? 'Normal Range' : 'Irregular'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>PCOS Daily Habits</strong></td>
                        <td>{formatPcosHabits(selectedPatient.pcos_habits)}</td>
                        <td>Consistent Metabolic &amp; Sleep Routine</td>
                        <td>
                          <span className={hasPcosHabits(selectedPatient.pcos_habits) ? 'badge-ok' : 'badge-warn'}>
                            {hasPcosHabits(selectedPatient.pcos_habits) ? 'Logged' : 'No Logs'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Adherence Score</strong></td>
                        <td><strong>{selectedPatient.adherence ?? 0}%</strong></td>
                        <td>&ge; 80% Target Compliance</td>
                        <td>
                          <span className={(selectedPatient.adherence ?? 0) >= 80 ? 'badge-ok' : 'badge-warn'}>
                            {(selectedPatient.adherence ?? 0) >= 80 ? 'On Track' : 'Needs Follow-up'}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="table-wrap" style={{ marginTop: 16 }}>
                  <div className="table-bar">
                    <div className="sec-lbl" style={{ margin: 0 }}>
                      Patient Symptom &amp; Mood Telemetry
                    </div>
                    <span className="ws-sub">{telemetryRows.length} recorded entries</span>
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Type</th>
                        <th>Primary Reading</th>
                        <th>Details / Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {telemetryRows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="table-empty">
                            No mood or symptom logs recorded for {selectedPatient.name}.
                          </td>
                        </tr>
                      ) : (
                        telemetryRows.map((row) => (
                          <tr key={row.id}>
                            <td>{row.timestamp}</td>
                            <td>
                              <span className={row.type === 'Mood' ? 'badge-plum' : 'badge-warn'}>
                                {row.type}
                              </span>
                            </td>
                            <td><strong>{row.primary}</strong></td>
                            <td>{row.details}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )
          )}

          {/* VIEW 3: CARE PLANS & RX */}
          {activeView === 'careplans' && (
            !selectedPatient ? (
              <div className="table-wrap">
                <div className="table-empty">
                  {patientLoading ? 'Loading patient care plans...' : 'Select a patient from the sidebar or Patient Roster.'}
                </div>
              </div>
            ) : (
              <>
                {showCarePlanDrawer && (
                  <form className="app-drawer" onSubmit={handleCreateCarePlan}>
                    <div className="sec-lbl" style={{ marginBottom: 10 }}>
                      <span>Assign Care Plan &amp; Sync Reminder — {selectedPatient.name}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
                      <div className="field-group">
                        <label htmlFor="cp-title">Order / Medication Title</label>
                        <input
                          id="cp-title"
                          type="text"
                          value={cpTitle}
                          onChange={(e) => setCpTitle(e.target.value)}
                          placeholder="e.g. Metformin 500mg"
                          required
                        />
                      </div>
                      <div className="field-group">
                        <label htmlFor="cp-category">Category</label>
                        <select id="cp-category" value={cpCategory} onChange={(e) => setCpCategory(e.target.value)}>
                          <option value="Medication">Medication</option>
                          <option value="Supplement">Supplement</option>
                          <option value="Lifestyle">Lifestyle</option>
                          <option value="Lab Follow-up">Lab Follow-up</option>
                        </select>
                      </div>
                      <div className="field-group">
                        <label htmlFor="cp-freq">Frequency</label>
                        <input
                          id="cp-freq"
                          type="text"
                          value={cpFrequency}
                          onChange={(e) => setCpFrequency(e.target.value)}
                          placeholder="e.g. Once daily after dinner"
                          required
                        />
                      </div>
                    </div>
                    <div className="field-group">
                      <label htmlFor="cp-notes">Clinical Notes</label>
                      <textarea
                        id="cp-notes"
                        rows={2}
                        style={{ margin: 0 }}
                        value={cpNotes}
                        onChange={(e) => setCpNotes(e.target.value)}
                        placeholder="Instructions for the patient..."
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button type="submit" className="ws-btn pri">Assign Care Plan</button>
                      <button type="button" className="ws-btn" onClick={() => setShowCarePlanDrawer(false)}>Cancel</button>
                      {cpStatus && <span className="ws-sub">{cpStatus}</span>}
                    </div>
                  </form>
                )}

                <div className="table-wrap">
                  <div className="table-bar">
                    <div className="sec-lbl" style={{ margin: 0 }}>
                      Active Care Plans &amp; Orders — {selectedPatient.name}
                    </div>
                    {cpStatus && !showCarePlanDrawer && <span className="badge-ok">{cpStatus}</span>}
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Order / Medication</th>
                        <th>Category</th>
                        <th>Frequency</th>
                        <th>Clinical Notes</th>
                        <th>Assigned By</th>
                        <th>Created</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!selectedPatient.care_plans?.length ? (
                        <tr>
                          <td colSpan={7} className="table-empty">
                            No active care plans assigned for {selectedPatient.name}. Click &ldquo;+ Assign Order&rdquo; to add one.
                          </td>
                        </tr>
                      ) : (
                        selectedPatient.care_plans.map((cp) => (
                          <tr key={cp.id}>
                            <td><strong>{cp.title}</strong></td>
                            <td><span className="badge-plum">{cp.category}</span></td>
                            <td>{cp.frequency || '—'}</td>
                            <td>{cp.notes || '—'}</td>
                            <td>{cp.assigned_by || doctorInfo.name || '—'}</td>
                            <td>{cp.created_at || '—'}</td>
                            <td>
                              <button
                                type="button"
                                className="ws-btn"
                                title="Remove care plan"
                                onClick={() => handleDeleteCarePlan(cp.id)}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )
          )}

          {/* VIEW 4: LAB & SCAN REPORTS */}
          {activeView === 'reports' && (
            !selectedPatient ? (
              <div className="table-wrap">
                <div className="table-empty">
                  {patientLoading ? 'Loading patient reports...' : 'Select a patient from the sidebar or Patient Roster.'}
                </div>
              </div>
            ) : (
              <>
                {showReportDrawer && (
                  <form className="app-drawer" onSubmit={handlePublishReport}>
                    <div className="sec-lbl" style={{ marginBottom: 10 }}>
                      <span>Publish Clinical Report — {selectedPatient.name}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                      <div className="field-group">
                        <label htmlFor="rep-title">Report Title</label>
                        <input
                          id="rep-title"
                          type="text"
                          value={repTitle}
                          onChange={(e) => setRepTitle(e.target.value)}
                          placeholder="e.g. Pelvic Ultrasound & Hormonal Panel"
                          required
                        />
                      </div>
                      <div className="field-group">
                        <label htmlFor="rep-status">Status</label>
                        <select id="rep-status" value={repStatus} onChange={(e) => setRepStatus(e.target.value)}>
                          <option value="Normal">Normal</option>
                          <option value="Attention">Attention</option>
                          <option value="Follow-up">Follow-up</option>
                        </select>
                      </div>
                    </div>
                    <div className="field-group">
                      <label htmlFor="rep-summary">Clinical Summary</label>
                      <textarea
                        id="rep-summary"
                        rows={2}
                        style={{ margin: 0 }}
                        value={repSummary}
                        onChange={(e) => setRepSummary(e.target.value)}
                        placeholder="Key lab findings..."
                        required
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="rep-plain">Plain-Language Explanation</label>
                      <textarea
                        id="rep-plain"
                        rows={2}
                        style={{ margin: 0 }}
                        value={repPlain}
                        onChange={(e) => setRepPlain(e.target.value)}
                        placeholder="Patient-friendly explanation..."
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button type="submit" className="ws-btn pri">Publish Report</button>
                      <button type="button" className="ws-btn" onClick={() => setShowReportDrawer(false)}>Cancel</button>
                      {repMsg && <span className="ws-sub">{repMsg}</span>}
                    </div>
                  </form>
                )}

                <div className="table-wrap">
                  <div className="table-bar">
                    <div className="sec-lbl" style={{ margin: 0 }}>
                      Published Lab &amp; Scan Reports — {selectedPatient.name}
                    </div>
                    {repMsg && !showReportDrawer && <span className="badge-ok">{repMsg}</span>}
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Report Title</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Clinical Summary</th>
                        <th>Patient Plain-Language Explanation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!selectedPatient.reports?.length ? (
                        <tr>
                          <td colSpan={5} className="table-empty">
                            No reports published yet for {selectedPatient.name}. Click &ldquo;+ Publish Report&rdquo; to add one.
                          </td>
                        </tr>
                      ) : (
                        selectedPatient.reports.map((rep) => (
                          <tr key={rep.id}>
                            <td><strong>{rep.title}</strong></td>
                            <td>{rep.date || '—'}</td>
                            <td>
                              <span className={rep.status === 'Normal' ? 'badge-ok' : 'badge-warn'}>
                                {rep.status}
                              </span>
                            </td>
                            <td>{rep.summary || '—'}</td>
                            <td>{rep.plain_explanation || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )
          )}

          {/* VIEW 5: APPOINTMENTS QUEUE */}
          {activeView === 'appointments' && (
            <div className="table-wrap">
              <div className="table-bar">
                <div className="sec-lbl" style={{ margin: 0 }}>Appointments Queue</div>
                <span className="ws-sub">{appointmentsList.length} total scheduled</span>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Phone</th>
                    <th>Consultation Service</th>
                    <th>Date &amp; Time</th>
                    <th>Mode</th>
                    <th>Notes</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointmentsList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="table-empty">
                        No appointments scheduled.
                      </td>
                    </tr>
                  ) : (
                    appointmentsList.map((appt) => (
                      <tr key={appt.id}>
                        <td><strong>{appt.name}</strong></td>
                        <td>{appt.phone || '—'}</td>
                        <td>{appt.service || '—'}</td>
                        <td>{appt.date || '—'}</td>
                        <td>{appt.mode || '—'}</td>
                        <td>{appt.notes || '—'}</td>
                        <td>
                          <span className={appt.status === 'Confirmed' || appt.status === 'Completed' ? 'badge-ok' : 'badge-warn'}>
                            {appt.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {appt.status !== 'Confirmed' && appt.status !== 'Completed' && (
                              <button
                                type="button"
                                className="ws-btn"
                                onClick={() => handleUpdateApptStatus(appt.id, 'Confirmed')}
                              >
                                Confirm
                              </button>
                            )}
                            {appt.status !== 'Completed' && (
                              <button
                                type="button"
                                className="ws-btn pri"
                                onClick={() => handleUpdateApptStatus(appt.id, 'Completed')}
                              >
                                Complete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW 6: DOCTOR ACCOUNT */}
          {activeView === 'account' && (
            <div className="table-wrap">
              <div className="table-bar">
                <div className="sec-lbl" style={{ margin: 0 }}>Doctor Account &amp; Clinic Profile</div>
                <span className="ws-sub">Updates sync to your session and patient-facing directory</span>
              </div>
              <div className="surface-pad">
                <form className="compact-form" style={{ padding: 0 }} onSubmit={handleSaveDoctorAccount}>
                  {docErr && (
                    <div className="badge-warn" style={{ marginBottom: 12, width: '100%', height: 'auto', padding: '6px 10px' }}>
                      {docErr}
                    </div>
                  )}
                  <div className="field-group">
                    <label htmlFor="doctor-acct-name">Doctor Name</label>
                    <input
                      id="doctor-acct-name"
                      type="text"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor="doctor-acct-specialty">Specialty</label>
                    <input
                      id="doctor-acct-specialty"
                      type="text"
                      value={docSpecialty}
                      onChange={(e) => setDocSpecialty(e.target.value)}
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor="doctor-acct-phone">Phone</label>
                    <input
                      id="doctor-acct-phone"
                      type="tel"
                      inputMode="tel"
                      maxLength={14}
                      value={docPhone}
                      onChange={(e) => setDocPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor="doctor-acct-clinics">Clinics (comma-separated)</label>
                    <input
                      id="doctor-acct-clinics"
                      type="text"
                      value={docClinics}
                      onChange={(e) => setDocClinics(e.target.value)}
                      placeholder="Vijay Nagar, Indore, Super Corridor, Indore"
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                    <button type="submit" className="ws-btn pri" disabled={docSaving}>
                      {docSaving ? 'Saving...' : 'Save Account'}
                    </button>
                    {docMsg && <span className="badge-ok">{docMsg}</span>}
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="mobile-bottom-nav" aria-label="Doctor mobile navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`mobile-nav-btn${activeView === item.id ? ' on' : ''}`}
              aria-current={activeView === item.id ? 'page' : undefined}
              onClick={() => selectDoctorView(item.id)}
            >
              <Icon d={item.icon} size={16} />
              <span>{item.shortLabel}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
