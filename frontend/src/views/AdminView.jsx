import React, { useEffect, useState } from 'react'
import { apiGet, apiPatch, apiPost } from '../api.js'

function formatClinics(doc) {
  if (Array.isArray(doc?.clinics) && doc.clinics.length > 0) {
    return doc.clinics.join(' · ')
  }
  if (typeof doc?.clinic === 'string' && doc.clinic.trim()) {
    return doc.clinic.trim()
  }
  return 'Indore Clinic'
}

export default function AdminView() {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [actionMsg, setActionMsg] = useState('')
  const [actionErr, setActionErr] = useState('')
  const [busyId, setBusyId] = useState('')

  // Enroll Doctor form state
  const [showEnrollForm, setShowEnrollForm] = useState(false)
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
      setShowEnrollForm(false)
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

  if (loading && !overview) {
    return (
      <div className="ws-wrap">
        <div className="surface surface-pad">
          <div className="ws-title">Loading Admin Portal...</div>
          <div className="ws-sub">Fetching GynAura Indore enrollments and clinic requests.</div>
        </div>
      </div>
    )
  }

  if (error && !overview) {
    return (
      <div className="ws-wrap">
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
    )
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

  return (
    <div className="ws-wrap">
      <div className="ws-bar">
        <div>
          <h1 className="ws-title">GynAura Admin Portal</h1>
          <div className="ws-sub">Gynecologist Enrollment &amp; Indore Clinic Approvals</div>
        </div>

        <div className="ws-actions">
          {actionMsg && <span className="badge-ok">{actionMsg}</span>}
          {actionErr && <span className="badge-warn">{actionErr}</span>}
          <button type="button" className="ws-btn" onClick={loadOverview} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            type="button"
            className="ws-btn pri"
            onClick={() => {
              setEnrollErr('')
              setShowEnrollForm((prev) => !prev)
            }}
          >
            {showEnrollForm ? 'Close Form' : '+ Enroll Doctor'}
          </button>
        </div>
      </div>

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

      {showEnrollForm && (
        <div className="surface surface-pad" style={{ marginBottom: 16 }}>
          <div className="sec-lbl">
            <span>Enroll Gynecologist</span>
          </div>
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
                <label htmlFor="enroll-phone">10-digit Phone</label>
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
                <label htmlFor="enroll-email">Email (for Google OAuth)</label>
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
                <label htmlFor="enroll-clinics">Clinics comma-separated</label>
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
                onClick={() => setShowEnrollForm(false)}
                disabled={enrolling}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="surface">
        <div className="cols-2">
          <div className="col-pane">
            <div className="sec-lbl">
              <span>Enrolled Gynecologists</span>
              <span>{doctors.length}</span>
            </div>

            {doctors.length === 0 ? (
              <div className="flat-row">
                <span className="ws-sub">No gynecologists enrolled yet.</span>
              </div>
            ) : (
              doctors.map((doc) => {
                const docStatus = (doc.status || 'active').toLowerCase()
                const isActive = docStatus === 'active'
                const isBusy = busyId === `doc-${doc.id}`
                return (
                  <div
                    key={doc.id || doc.phone || doc.name}
                    className="flat-row"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <strong>{doc.name}</strong>
                        <span className={isActive ? 'badge-ok' : 'badge-warn'}>{docStatus}</span>
                      </div>
                      <div className="ws-sub">
                        {doc.phone || '—'}
                        {doc.email ? ` · ${doc.email}` : ''}
                      </div>
                      <div className="ws-sub">
                        {doc.nmc_reg ? `NMC: ${doc.nmc_reg} · ` : ''}
                        {formatClinics(doc)}
                      </div>
                      {doc.specialty && <div className="ws-sub">{doc.specialty}</div>}
                    </div>

                    <button
                      type="button"
                      className="ws-btn"
                      style={{ flexShrink: 0 }}
                      disabled={isBusy}
                      onClick={() => handleToggleDoctorStatus(doc)}
                    >
                      {isBusy ? 'Updating…' : isActive ? 'Suspend' : 'Activate'}
                    </button>
                  </div>
                )
              })
            )}
          </div>

          <div className="col-pane">
            <div className="sec-lbl">
              <span>Clinic Onboarding Requests</span>
              <span>{clinicRequests.length}</span>
            </div>

            {clinicRequests.length === 0 ? (
              <div className="flat-row">
                <span className="ws-sub">No clinic onboarding requests submitted from the home page yet.</span>
              </div>
            ) : (
              clinicRequests.map((req) => {
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
                  <div
                    key={req.id}
                    className="flat-row"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <strong>{req.clinicName || req.clinic_name || 'Clinic'}</strong>
                        <span className={badgeClass}>{reqStatus}</span>
                      </div>
                      <div className="ws-sub">
                        {req.doctor || '—'} · {req.city || 'Indore'}
                      </div>
                      <div className="ws-sub">
                        {req.phone || '—'}
                        {req.created_at ? ` · ${req.created_at}` : ''}
                      </div>
                    </div>

                    {isPending && (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
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
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
