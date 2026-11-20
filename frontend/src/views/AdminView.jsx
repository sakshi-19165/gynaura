import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiGet, apiPatch, apiPost, clearSession, getSession } from '../api.js'
import { Icon, I } from '../components/Icons.jsx'

function getTimeGreeting() {
  const hr = new Date().getHours()
  if (hr < 12) return 'Good morning'
  if (hr < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatClinics(doc) {
  if (Array.isArray(doc?.clinics) && doc.clinics.length > 0) {
    return doc.clinics.join(' · ')
  }
  if (typeof doc?.clinic === 'string' && doc.clinic.trim()) {
    return doc.clinic.trim()
  }
  return 'Indore Clinic'
}

const TAB_TITLES = {
  doctors: 'Enrolled Doctors',
  requests: 'Clinic Requests',
  enroll: 'Enroll New Doctor',
}

export default function AdminView() {
  const navigate = useNavigate()
  const session = getSession()
  const adminName = session?.user?.name || 'System Administrator'
  const greeting = getTimeGreeting()

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

  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [activeTab, setActiveTab] = useState('doctors')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [doctorQuery, setDoctorQuery] = useState('')
  const [requestFilter, setRequestFilter] = useState('all')
  const [inspectedDoctor, setInspectedDoctor] = useState(null)

  const [actionMsg, setActionMsg] = useState('')
  const [actionErr, setActionErr] = useState('')
  const [busyId, setBusyId] = useState('')

  // Enroll Doctor form state
  const [enrollName, setEnrollName] = useState('')
  const [enrollPhone, setEnrollPhone] = useState('')
  const [enrollEmail, setEnrollEmail] = useState('')
  const [enrollNmcReg, setEnrollNmcReg] = useState('')
  const [enrollSpecialty, setEnrollSpecialty] = useState('')
  const [enrollClinics, setEnrollClinics] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [enrollErr, setEnrollErr] = useState('')

  const loadOverview = async () => {
    try {
      setLoading(true)
      const res = await apiGet('/admin/overview')
      setOverview(res)
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to load admin overview')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOverview()
  }, [])

  const showFeedback = (msg) => {
    setActionErr('')
    setActionMsg(msg)
    setTimeout(() => setActionMsg(''), 4000)
  }

  const openEnrollTab = () => {
    setEnrollErr('')
    setInspectedDoctor(null)
    setActiveTab('enroll')
  }

  const handleEnrollDoctor = async (e) => {
    e.preventDefault()
    const rawPhone = enrollPhone.trim()
    const digits = rawPhone.replace(/\D/g, '')
    if (!enrollName.trim()) {
      setEnrollErr('Doctor name is required.')
      return
    }
    if (digits.length !== 10 && !(digits.length === 12 && digits.startsWith('91'))) {
      setEnrollErr('Please enter a valid 10-digit mobile number.')
      return
    }
    const targetPhone = rawPhone.startsWith('+') ? `+${digits}` : digits
    const clinicsList = enrollClinics
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)

    try {
      setEnrolling(true)
      setEnrollErr('')
      await apiPost('/admin/doctors', {
        name: enrollName.trim(),
        phone: targetPhone,
        email: enrollEmail.trim(),
        nmc_reg: enrollNmcReg.trim(),
        specialty: enrollSpecialty.trim(),
        clinics: clinicsList,
      })
      setEnrollName('')
      setEnrollPhone('')
      setEnrollEmail('')
      setEnrollNmcReg('')
      setEnrollSpecialty('')
      setEnrollClinics('')
      setActiveTab('doctors')
      await loadOverview()
      showFeedback('Doctor enrolled successfully.')
    } catch (err) {
      setEnrollErr(err.message || 'Failed to enroll doctor.')
    } finally {
      setEnrolling(false)
    }
  }

  const handleToggleDoctorStatus = async (doc) => {
    const currentStatus = (doc.status || 'active').toLowerCase()
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active'
    try {
      setBusyId(`doc-${doc.id}`)
      setActionErr('')
      await apiPatch(`/admin/doctors/${doc.id}`, { status: nextStatus })
      await loadOverview()
      if (inspectedDoctor?.id === doc.id) {
        setInspectedDoctor((prev) => (prev ? { ...prev, status: nextStatus } : prev))
      }
      showFeedback(`${doc.name} marked ${nextStatus}.`)
    } catch (err) {
      setActionErr(err.message || 'Failed to update doctor status.')
    } finally {
      setBusyId('')
    }
  }

  const handleClinicRequestAction = async (req, action) => {
    try {
      setBusyId(`req-${req.id}`)
      setActionErr('')
      await apiPost(`/admin/clinic-requests/${req.id}/${action}`, {})
      await loadOverview()
      showFeedback(
        action === 'approve'
          ? `Approved ${req.clinicName || req.clinic_name || 'clinic request'} and enrolled ${req.doctor || 'doctor'}.`
          : `Rejected clinic request for ${req.clinicName || req.clinic_name || 'clinic'}.`
      )
    } catch (err) {
      setActionErr(err.message || `Failed to ${action} clinic request.`)
    } finally {
      setBusyId('')
    }
  }

  const doctors = overview?.doctors || []
  const clinicRequests = overview?.clinic_requests || overview?.requests || overview?.clinics || []
  const kpis = overview?.kpis || overview || {}

  const enrolledDoctors = kpis.enrolled_doctors ?? kpis.total_doctors ?? doctors.length
  const activeDoctors =
    kpis.active_doctors ??
    doctors.filter((d) => (d.status || 'active').toLowerCase() === 'active').length
  const pendingRequests =
    kpis.pending_requests ??
    clinicRequests.filter((r) => (r.status || 'pending').toLowerCase() === 'pending').length
  const totalPatients = kpis.total_patients ?? overview?.total_patients ?? 0

  const activeTabTitle = TAB_TITLES[activeTab] || 'Enrolled Doctors'

  const filteredDoctors = doctors.filter((doc) => {
    const q = doctorQuery.trim().toLowerCase()
    if (!q) return true
    return (
      (doc.name || '').toLowerCase().includes(q) ||
      (doc.nmc_reg || '').toLowerCase().includes(q) ||
      (doc.specialty || '').toLowerCase().includes(q) ||
      (doc.phone || '').toLowerCase().includes(q) ||
      (doc.email || '').toLowerCase().includes(q) ||
      formatClinics(doc).toLowerCase().includes(q)
    )
  })

  const filteredRequests = clinicRequests.filter((req) => {
    if (requestFilter === 'all') return true
    return (req.status || 'pending').toLowerCase() === requestFilter
  })

  if (loading && !overview) {
    return (
      <div className="webapp-shell">
        <aside className="webapp-sidebar">
          <div>
            <div className="sidebar-group-lbl">Admin Console</div>
            <nav className="sidebar-nav">
              <button type="button" className="sidebar-link on">
                <span>Enrolled Doctors</span>
              </button>
              <button type="button" className="sidebar-link">
                <span>Clinic Requests</span>
              </button>
              <button type="button" className="sidebar-link">
                <span>+ Enroll New Doctor</span>
              </button>
            </nav>
          </div>
        </aside>
        <div className="webapp-main">
          <div className="webapp-toolbar">
            <div className="webapp-breadcrumb">
              <span>GynAura Admin</span>
              <span>/</span>
              <strong>Loading</strong>
            </div>
          </div>
          <div className="webapp-content ws-wrap">
            <div className="surface surface-pad">
              <div className="ws-title">Loading Admin Portal...</div>
              <div className="ws-sub">Fetching GynAura Indore enrollments and clinic requests.</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !overview) {
    return (
      <div className="webapp-shell">
        <aside className="webapp-sidebar">
          <div>
            <div className="sidebar-group-lbl">Admin Console</div>
            <nav className="sidebar-nav">
              <button type="button" className="sidebar-link on">
                <span>Enrolled Doctors</span>
              </button>
            </nav>
          </div>
        </aside>
        <div className="webapp-main">
          <div className="webapp-toolbar">
            <div className="webapp-breadcrumb">
              <span>GynAura Admin</span>
              <span>/</span>
              <strong>Connection Error</strong>
            </div>
          </div>
          <div className="webapp-content ws-wrap">
            <div className="surface surface-pad">
              <div className="ws-title">Unable to Connect</div>
              <div className="ws-sub">{error}</div>
              <div style={{ marginTop: 12 }}>
                <button type="button" className="ws-btn pri" onClick={loadOverview}>
                  Retry Connection
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="webapp-shell ws-wrap" style={{ maxWidth: 'none', margin: 0, padding: 0 }}>
      <div
        className={`webapp-backdrop${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Left App Sidebar */}
      <aside className={`webapp-sidebar${sidebarOpen ? ' open' : ''}`} aria-label="Admin Console Sidebar">
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
            <Link to="/admin" className="brand" style={{ fontSize: '.95rem' }} onClick={() => setSidebarOpen(false)}>
              <span className="logo" style={{ width: 24, height: 24, fontSize: '.78rem' }}>
                G
              </span>
              GynAura Admin
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
              AD
              <span className="sidebar-avatar-dot" />
            </div>
            <div className="sidebar-profile-meta">
              <div className="sidebar-profile-name">{adminName}</div>
              <div className="sidebar-profile-sub">Indore Network Governance</div>
            </div>
          </div>

          <div className="sidebar-group-lbl">
            <span>Admin Console</span>
            <span>3 views</span>
          </div>
          <nav className="sidebar-nav" aria-label="Admin Console Navigation">
            <button
              type="button"
              className={`sidebar-link ${activeTab === 'doctors' ? 'on' : ''}`}
              aria-current={activeTab === 'doctors' ? 'page' : undefined}
              onClick={() => {
                setActiveTab('doctors')
                setSidebarOpen(false)
              }}
            >
              <span className="sidebar-link-main">
                <span className="sidebar-ico-box">
                  <Icon d={I.user} size={14} />
                </span>
                <span>Enrolled Doctors</span>
              </span>
              <span className="sidebar-count">{doctors.length}</span>
            </button>
            <button
              type="button"
              className={`sidebar-link ${activeTab === 'requests' ? 'on' : ''}`}
              aria-current={activeTab === 'requests' ? 'page' : undefined}
              onClick={() => {
                setInspectedDoctor(null)
                setActiveTab('requests')
                setSidebarOpen(false)
              }}
            >
              <span className="sidebar-link-main">
                <span className="sidebar-ico-box">
                  <Icon d={I.clip} size={14} />
                </span>
                <span>Clinic Requests</span>
              </span>
              <span className={pendingRequests > 0 ? 'badge-warn' : 'sidebar-count'}>
                {pendingRequests}
              </span>
            </button>
            <button
              type="button"
              className={`sidebar-link ${activeTab === 'enroll' ? 'on' : ''}`}
              aria-current={activeTab === 'enroll' ? 'page' : undefined}
              onClick={() => {
                openEnrollTab()
                setSidebarOpen(false)
              }}
            >
              <span className="sidebar-link-main">
                <span className="sidebar-ico-box">
                  <Icon d={I.shield} size={14} />
                </span>
                <span>+ Enroll New Doctor</span>
              </span>
            </button>
          </nav>

          {/* Network Telemetry Card */}
          <div className="sidebar-widget" aria-label="Indore network telemetry">
            <div className="sidebar-widget-head">
              <span className="sidebar-widget-lbl">Indore Network</span>
              <span className="badge-ok">Online</span>
            </div>
            <div className="sidebar-mini-grid">
              <div className="sidebar-mini-stat">
                <small>Active MDs</small>
                <strong>{activeDoctors} / {enrolledDoctors}</strong>
              </div>
              <div className="sidebar-mini-stat">
                <small>Patients</small>
                <strong>{totalPatients} Linked</strong>
              </div>
            </div>
            <div className="sidebar-kv-list" style={{ marginTop: 4 }}>
              <div className="sidebar-kv">
                <span>Pending Approvals</span>
                <strong>{pendingRequests} requests</strong>
              </div>
            </div>
          </div>
        </div>

        <div style={{ paddingTop: 8, borderTop: '1px solid var(--line)' }}>
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
        </div>
      </aside>

      {/* Main Pane */}
      <div className="webapp-main">
        <div className="webapp-toolbar">
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
              <strong>{adminName}</strong>
              <span>·</span>
              <span>{activeTabTitle}</span>
            </div>
          </div>

          <div className="ws-actions">
            {actionMsg && <span className="badge-ok" role="status" aria-live="polite">{actionMsg}</span>}
            {actionErr && <span className="badge-warn" role="alert">{actionErr}</span>}
            <button
              type="button"
              className="ws-btn"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
            >
              {theme === 'dark' ? '☀ Light' : '☾ Dark'}
            </button>
            <button type="button" className="ws-btn" onClick={loadOverview} disabled={loading}>
              {loading ? 'Refreshing…' : 'Sync Network'}
            </button>
            <button type="button" className="ws-btn pri" onClick={openEnrollTab}>
              + Enroll Doctor
            </button>
            <button type="button" className="ws-btn" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>

        <div className="webapp-content">
          <div className="view-head">
            <div>
              <h1>{greeting}, {adminName}</h1>
              <p>GynAura Indore Clinical Governance · Enrolled Gynecologists &amp; Clinic Onboarding</p>
            </div>
          </div>

          {/* 4-Column Segmented KPI Bar */}
          <div className="seg-kpis">
            <div className="seg-kpi">
              <span className="seg-kpi-lbl">Enrolled Doctors</span>
              <strong>{enrolledDoctors}</strong>
            </div>
            <div className="seg-kpi">
              <span className="seg-kpi-lbl">Active Doctors</span>
              <strong>{activeDoctors}</strong>
            </div>
            <div className="seg-kpi">
              <span className="seg-kpi-lbl">Pending Requests</span>
              <strong>{pendingRequests}</strong>
            </div>
            <div className="seg-kpi">
              <span className="seg-kpi-lbl">Total Patients</span>
              <strong>{totalPatients}</strong>
            </div>
          </div>

          {/* Doctor Quick-Inspect Drawer */}
          {activeTab === 'doctors' && inspectedDoctor && (
            <div className="app-drawer">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '0.96rem' }}>{inspectedDoctor.name}</strong>
                  <span
                    className={
                      (inspectedDoctor.status || 'active').toLowerCase() === 'active'
                        ? 'badge-ok'
                        : 'badge-warn'
                    }
                  >
                    {(inspectedDoctor.status || 'active').toLowerCase()}
                  </span>
                </div>
                <button
                  type="button"
                  className="ws-btn"
                  onClick={() => setInspectedDoctor(null)}
                >
                  Close
                </button>
              </div>
              <div className="split-2">
                <div className="ws-sub">
                  <strong>NMC Reg No.:</strong> {inspectedDoctor.nmc_reg || '—'}
                </div>
                <div className="ws-sub">
                  <strong>Specialty:</strong> {inspectedDoctor.specialty || 'Obstetrics & Gynecology'}
                </div>
                <div className="ws-sub">
                  <strong>Phone:</strong> {inspectedDoctor.phone || '—'}
                </div>
                <div className="ws-sub">
                  <strong>Email:</strong> {inspectedDoctor.email || '—'}
                </div>
                <div className="ws-sub" style={{ gridColumn: '1 / -1' }}>
                  <strong>Clinics:</strong> {formatClinics(inspectedDoctor)}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Enrolled Doctors */}
          {activeTab === 'doctors' && (
            <div className="table-wrap">
              <div className="table-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="sec-lbl" style={{ margin: 0 }}>Enrolled Gynecologists</span>
                  <span className="badge-plum">{filteredDoctors.length}</span>
                </div>
                <input
                  type="search"
                  className="roster-search"
                  style={{ width: 260, maxWidth: '100%' }}
                  placeholder="Filter by name, NMC, clinic, phone…"
                  value={doctorQuery}
                  onChange={(e) => setDoctorQuery(e.target.value)}
                />
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Doctor Name</th>
                    <th>NMC Reg No.</th>
                    <th>Specialty</th>
                    <th>Clinics</th>
                    <th>Phone / Email</th>
                    <th>Status</th>
                    <th className="num">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDoctors.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="table-empty">
                        {doctors.length === 0
                          ? 'No gynecologists enrolled yet.'
                          : 'No doctors match the current search filter.'}
                      </td>
                    </tr>
                  ) : (
                    filteredDoctors.map((doc) => {
                      const docStatus = (doc.status || 'active').toLowerCase()
                      const isActive = docStatus === 'active'
                      const isBusy = busyId === `doc-${doc.id}`
                      return (
                        <tr key={doc.id || doc.phone || doc.name}>
                          <td>
                            <button
                              type="button"
                              onClick={() =>
                                setInspectedDoctor((prev) => (prev?.id === doc.id ? null : doc))
                              }
                              style={{
                                background: 'transparent',
                                border: 0,
                                padding: 0,
                                color: 'inherit',
                                font: 'inherit',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textAlign: 'left',
                              }}
                            >
                              {doc.name}
                            </button>
                          </td>
                          <td>{doc.nmc_reg || '—'}</td>
                          <td>{doc.specialty || 'Obstetrics & Gynecology'}</td>
                          <td>{formatClinics(doc)}</td>
                          <td>
                            <div>{doc.phone || '—'}</div>
                            {doc.email && <div className="ws-sub">{doc.email}</div>}
                          </td>
                          <td>
                            <span className={isActive ? 'badge-ok' : 'badge-warn'}>
                              {docStatus}
                            </span>
                          </td>
                          <td className="num">
                            <button
                              type="button"
                              className="ws-btn"
                              disabled={isBusy}
                              onClick={() => handleToggleDoctorStatus(doc)}
                            >
                              {isBusy ? 'Updating…' : isActive ? 'Suspend' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab: Clinic Requests */}
          {activeTab === 'requests' && (
            <div className="table-wrap">
              <div className="table-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="sec-lbl" style={{ margin: 0 }}>Clinic Onboarding Requests</span>
                  <span className="badge-plum">{filteredRequests.length}</span>
                </div>
                <div className="pill-row" style={{ marginTop: 0 }}>
                  {['all', 'pending', 'approved', 'rejected'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={`mini-pill ${requestFilter === st ? 'on' : ''}`}
                      onClick={() => setRequestFilter(st)}
                    >
                      {st.charAt(0).toUpperCase() + st.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Doctor Name</th>
                    <th>Clinic / Hospital</th>
                    <th>City</th>
                    <th>Phone</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th className="num">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="table-empty">
                        {clinicRequests.length === 0
                          ? 'No clinic onboarding requests submitted from the home page yet.'
                          : 'No clinic requests match this status filter.'}
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => {
                      const reqStatus = (req.status || 'pending').toLowerCase()
                      const isPending = reqStatus === 'pending'
                      const isBusy = busyId === `req-${req.id}`
                      const badgeClass =
                        reqStatus === 'approved'
                          ? 'badge-ok'
                          : reqStatus === 'rejected'
                            ? 'badge-warn'
                            : 'badge-plum'

                      return (
                        <tr key={req.id}>
                          <td>
                            <strong>{req.doctor || '—'}</strong>
                          </td>
                          <td>{req.clinicName || req.clinic_name || 'Clinic'}</td>
                          <td>{req.city || 'Indore'}</td>
                          <td>{req.phone || '—'}</td>
                          <td>{req.created_at || '—'}</td>
                          <td>
                            <span className={badgeClass}>{reqStatus}</span>
                          </td>
                          <td className="num">
                            {isPending ? (
                              <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  className="ws-btn pri"
                                  disabled={isBusy}
                                  onClick={() => handleClinicRequestAction(req, 'approve')}
                                >
                                  {isBusy ? 'Saving…' : 'Approve & Enroll'}
                                </button>
                                <button
                                  type="button"
                                  className="ws-btn"
                                  disabled={isBusy}
                                  onClick={() => handleClinicRequestAction(req, 'reject')}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="ws-sub">Reviewed</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab: Enroll New Doctor */}
          {activeTab === 'enroll' && (
            <div className="table-wrap">
              <div className="table-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="sec-lbl" style={{ margin: 0 }}>Enroll Gynecologist</span>
                </div>
                <button
                  type="button"
                  className="ws-btn"
                  onClick={() => setActiveTab('doctors')}
                  disabled={enrolling}
                >
                  Back to Doctors
                </button>
              </div>

              <div className="surface-pad">
                {enrollErr && (
                  <div className="badge-warn" style={{ marginBottom: 12, height: 'auto', padding: '5px 10px' }}>
                    {enrollErr}
                  </div>
                )}
                <form onSubmit={handleEnrollDoctor}>
                  <div className="split-2">
                    <div className="field-group">
                      <label htmlFor="enroll-name">Name</label>
                      <input
                        id="enroll-name"
                        type="text"
                        placeholder="Dr. Ananya Mehta, MD"
                        value={enrollName}
                        onChange={(e) => setEnrollName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="enroll-phone">Phone</label>
                      <input
                        id="enroll-phone"
                        type="tel"
                        inputMode="tel"
                        maxLength={14}
                        placeholder="9826012345"
                        value={enrollPhone}
                        onChange={(e) => setEnrollPhone(e.target.value)}
                        required
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="enroll-email">Email</label>
                      <input
                        id="enroll-email"
                        type="email"
                        placeholder="doctor@clinic.in"
                        value={enrollEmail}
                        onChange={(e) => setEnrollEmail(e.target.value)}
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="enroll-nmc">NMC Reg No.</label>
                      <input
                        id="enroll-nmc"
                        type="text"
                        placeholder="MP-MC-2019-4821"
                        value={enrollNmcReg}
                        onChange={(e) => setEnrollNmcReg(e.target.value)}
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="enroll-specialty">Specialty</label>
                      <input
                        id="enroll-specialty"
                        type="text"
                        placeholder="OB-GYN & High-Risk Obstetrics"
                        value={enrollSpecialty}
                        onChange={(e) => setEnrollSpecialty(e.target.value)}
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="enroll-clinics">Clinics</label>
                      <input
                        id="enroll-clinics"
                        type="text"
                        placeholder="Vijay Nagar, Indore, Super Corridor, Indore"
                        value={enrollClinics}
                        onChange={(e) => setEnrollClinics(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button type="submit" className="ws-btn pri" disabled={enrolling}>
                      {enrolling ? 'Enrolling…' : 'Enroll Doctor'}
                    </button>
                    <button
                      type="button"
                      className="ws-btn"
                      onClick={() => setActiveTab('doctors')}
                      disabled={enrolling}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="mobile-bottom-nav" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }} aria-label="Admin mobile navigation">
          <button
            type="button"
            className={`mobile-nav-btn${activeTab === 'doctors' ? ' on' : ''}`}
            aria-current={activeTab === 'doctors' ? 'page' : undefined}
            onClick={() => setActiveTab('doctors')}
          >
            <Icon d={I.user} size={16} />
            <span>Doctors</span>
          </button>
          <button
            type="button"
            className={`mobile-nav-btn${activeTab === 'requests' ? ' on' : ''}`}
            aria-current={activeTab === 'requests' ? 'page' : undefined}
            onClick={() => {
              setInspectedDoctor(null)
              setActiveTab('requests')
            }}
          >
            <Icon d={I.clip} size={16} />
            <span>Requests</span>
          </button>
          <button
            type="button"
            className={`mobile-nav-btn${activeTab === 'enroll' ? ' on' : ''}`}
            aria-current={activeTab === 'enroll' ? 'page' : undefined}
            onClick={openEnrollTab}
          >
            <Icon d={I.shield} size={16} />
            <span>+ Enroll</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
