import React, { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPatch, apiDelete, getSession, setSession } from '../api.js'

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

export default function DoctorView() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Main workspace mode: 'charts' | 'appointments'
  const [mainTab, setMainTab] = useState('charts')

  // Patient roster & selection
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [selectedPatientId, setSelectedPatientId] = useState(null)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [patientLoading, setPatientLoading] = useState(false)

  // Chart sub-tabs: 'overview' | 'careplan' | 'report'
  const [clinicalTab, setClinicalTab] = useState('overview')

  // Care plan form
  const [cpTitle, setCpTitle] = useState('')
  const [cpCategory, setCpCategory] = useState('Medication')
  const [cpFrequency, setCpFrequency] = useState('Once daily')
  const [cpNotes, setCpNotes] = useState('')
  const [cpStatus, setCpStatus] = useState('')

  // Report form
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
  const [showAccountEdit, setShowAccountEdit] = useState(false)
  const [docName, setDocName] = useState('')
  const [docSpecialty, setDocSpecialty] = useState('')
  const [docPhone, setDocPhone] = useState('')
  const [docClinics, setDocClinics] = useState('')
  const [docSaving, setDocSaving] = useState(false)
  const [docMsg, setDocMsg] = useState('')
  const [docErr, setDocErr] = useState('')

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

  useEffect(() => {
    loadDashboard()
  }, [])

  useEffect(() => {
    if (!selectedPatientId) return
    const fetchPatient = async () => {
      try {
        setPatientLoading(true)
        const res = await apiGet(`/doctor/patients/${selectedPatientId}`)
        setSelectedPatient(res)
      } catch (err) {
        console.error(err)
      } finally {
        setPatientLoading(false)
      }
    }
    fetchPatient()
  }, [selectedPatientId])

  const handleCreateCarePlan = async (e) => {
    e.preventDefault()
    if (!selectedPatient) return
    try {
      setCpStatus('Syncing care plan...')
      const res = await apiPost(`/doctor/patients/${selectedPatient.id}/care-plan`, {
        title: cpTitle,
        category: cpCategory,
        frequency: cpFrequency,
        notes: cpNotes
      })
      setSelectedPatient({
        ...selectedPatient,
        care_plans: res.care_plans,
        reminders: res.reminders
      })
      setCpStatus('Care plan synced to patient portal.')
      setCpTitle('')
      setCpNotes('')
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
        plain_explanation: repPlain
      })
      setSelectedPatient({
        ...selectedPatient,
        reports: res.reports
      })
      setRepMsg('Report published to patient portal.')
      setRepTitle('')
      setRepSummary('')
      setRepPlain('')
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

  const handleToggleAccountEdit = () => {
    if (!showAccountEdit) {
      const doc = dashboard?.doctor || getSession()?.user || {}
      setDocName(doc.name || 'Dr. Sarah Jenkins, MD, FACOG')
      setDocSpecialty(doc.specialty || '')
      setDocPhone(doc.phone || '')
      setDocClinics(
        Array.isArray(doc.clinics)
          ? doc.clinics.join(', ')
          : (doc.clinic || '')
      )
      setDocErr('')
    }
    setShowAccountEdit((prev) => !prev)
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
      setShowAccountEdit(false)
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
      (p.tag && p.tag.toLowerCase().includes(q))
    if (categoryFilter === 'All') return matchesSearch
    if (categoryFilter === 'High-Risk') return matchesSearch && Boolean(p.high_priority)
    return matchesSearch && p.tag === categoryFilter
  })

  const latestMood = selectedPatient?.mood_logs?.[0]
  const latestSymptom = selectedPatient?.symptom_logs?.[0]
  const cycleDay = computeCycleDay(selectedPatient?.cycle?.last_period, selectedPatient?.cycle?.cycle_length)

  return (
    <div className="ws-wrap">
      {/* Compact Workspace Header */}
      <div className="ws-bar">
        <div>
          <h1 className="ws-title">{doctorInfo.name || 'Dr. Sarah Jenkins, MD, FACOG'}</h1>
          <div className="ws-sub">
            {doctorInfo.specialty ? `${doctorInfo.specialty} · ` : ''}
            {doctorClinicsText}
          </div>
        </div>

        <div className="ws-actions" style={{ position: 'relative' }}>
          {docMsg && <span className="badge-ok">{docMsg}</span>}
          <button
            type="button"
            className={`ws-btn ${mainTab === 'charts' ? 'pri' : ''}`}
            onClick={() => setMainTab('charts')}
          >
            Patient Charts
          </button>
          <button
            type="button"
            className={`ws-btn ${mainTab === 'appointments' ? 'pri' : ''}`}
            onClick={() => setMainTab('appointments')}
          >
            Appointments Queue
          </button>
          <button
            type="button"
            className={`ws-btn ${showAccountEdit ? 'pri' : ''}`}
            onClick={handleToggleAccountEdit}
          >
            Edit Account
          </button>
          <button
            type="button"
            className="ws-btn"
            onClick={loadDashboard}
          >
            Refresh
          </button>

          {showAccountEdit && (
            <form className="otp-pop" onSubmit={handleSaveDoctorAccount}>
              <div className="sec-lbl" style={{ marginBottom: 10 }}>
                <span>Doctor Account</span>
              </div>
              {docErr && (
                <div className="badge-warn" style={{ marginBottom: 10, width: '100%', height: 'auto', padding: '5px 8px' }}>
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
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="submit"
                  className="ws-btn pri"
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={docSaving}
                >
                  {docSaving ? 'Saving...' : 'Save Account'}
                </button>
                <button
                  type="button"
                  className="ws-btn"
                  onClick={() => setShowAccountEdit(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* 4-Column Segmented KPI Bar */}
      <div className="seg-kpis">
        <div className="seg-kpi">
          <span>Active Patients</span>
          <strong>{kpis.total_patients}</strong>
        </div>
        <div className="seg-kpi">
          <span>Upcoming Appointments</span>
          <strong>{kpis.upcoming_appointments}</strong>
        </div>
        <div className="seg-kpi">
          <span>High-Risk Alerts</span>
          <strong>{kpis.high_priority}</strong>
        </div>
        <div className="seg-kpi">
          <span>Avg Adherence</span>
          <strong>{kpis.avg_adherence}%</strong>
        </div>
      </div>

      {/* Main Workspace */}
      {mainTab === 'charts' ? (
        <div className="clinical-grid">
          {/* Left Roster */}
          <div className="surface">
            <div className="surface-pad">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span className="sec-lbl" style={{ margin: 0 }}>PATIENTS</span>
                <button
                  type="button"
                  className="ws-btn"
                  style={{ height: 26, padding: '0 8px', fontSize: '0.76rem' }}
                  onClick={() => setShowAddPatient((v) => !v)}
                >
                  {showAddPatient ? 'Cancel' : '+ Add'}
                </button>
              </div>

              {showAddPatient && (
                <form
                  onSubmit={handleAddPatient}
                  style={{
                    background: 'var(--surf2)',
                    border: '1px solid var(--line-hi)',
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--plum2)' }}>New Patient</div>
                  {addPatientError && <div className="ws-sub" style={{ color: '#f87171' }}>{addPatientError}</div>}
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newPatientName}
                    onChange={(e) => setNewPatientName(e.target.value)}
                    required
                    style={{ padding: '6px 8px', fontSize: '0.8rem', borderRadius: 6 }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: 6 }}>
                    <input
                      type="tel"
                      inputMode="tel"
                      maxLength={14}
                      placeholder="Phone"
                      value={newPatientPhone}
                      onChange={(e) => setNewPatientPhone(e.target.value)}
                      required
                      style={{ padding: '6px 8px', fontSize: '0.8rem', borderRadius: 6 }}
                    />
                    <input
                      type="number"
                      min={12}
                      max={100}
                      placeholder="Age"
                      value={newPatientAge}
                      onChange={(e) => setNewPatientAge(e.target.value)}
                      required
                      style={{ padding: '6px 8px', fontSize: '0.8rem', borderRadius: 6 }}
                    />
                  </div>
                  <select
                    value={newPatientTag}
                    onChange={(e) => setNewPatientTag(e.target.value)}
                    style={{ padding: '6px 8px', fontSize: '0.8rem', borderRadius: 6 }}
                  >
                    <option value="Antenatal">Antenatal</option>
                    <option value="PCOS">PCOS</option>
                    <option value="Fertility">Fertility</option>
                    <option value="High-Risk">High-Risk</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Summary (optional)"
                    value={newPatientSummary}
                    onChange={(e) => setNewPatientSummary(e.target.value)}
                    style={{ padding: '6px 8px', fontSize: '0.8rem', borderRadius: 6 }}
                  />
                  <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                    <button
                      type="submit"
                      className="ws-btn pri"
                      style={{ height: 26, fontSize: '0.76rem', flex: 1 }}
                      disabled={addPatientLoading}
                    >
                      {addPatientLoading ? 'Saving...' : 'Save Patient'}
                    </button>
                    <button
                      type="button"
                      className="ws-btn"
                      style={{ height: 26, fontSize: '0.76rem' }}
                      onClick={() => setShowAddPatient(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <input
                type="search"
                className="roster-search"
                placeholder="Search patient, tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="pill-row">
                {['All', 'Antenatal', 'PCOS', 'Fertility', 'High-Risk'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`mini-pill ${categoryFilter === cat ? 'active' : ''}`}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="roster-rows">
                {filteredPatients.length === 0 ? (
                  <div className="ws-sub" style={{ padding: '12px 4px' }}>No matching patients.</div>
                ) : (
                  filteredPatients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`roster-row ${selectedPatientId === p.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedPatientId(p.id)
                        setClinicalTab('overview')
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                          {p.high_priority && <span className="priority-dot" title="High Priority" />}
                          {p.name}
                        </span>
                        <span>{p.adherence ?? 0}%</span>
                      </div>
                      <div className="ws-sub">
                        {p.age ? `${p.age}y` : ''}{p.age && p.tag ? ' · ' : ''}{p.tag || ''}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Clinical Chart */}
          <div className="surface">
            {!selectedPatient ? (
              <div className="surface-pad">
                <div className="ws-sub">{patientLoading ? 'Loading patient chart...' : 'Select a patient from the roster.'}</div>
              </div>
            ) : (
              <>
                <div className="chart-head">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span className="ws-title">{selectedPatient.name}</span>
                        <span className="ws-sub">{selectedPatient.age} yrs · {selectedPatient.phone}</span>
                        {selectedPatient.tag && <span className="badge-plum">{selectedPatient.tag}</span>}
                      </div>
                      {selectedPatient.summary && (
                        <div className="ws-sub" style={{ marginTop: 4 }}>{selectedPatient.summary}</div>
                      )}
                    </div>
                    <div className="ws-sub">
                      Adherence: <strong>{selectedPatient.adherence ?? 0}%</strong>
                    </div>
                  </div>
                </div>

                <div className="uline-tabs">
                  <button
                    type="button"
                    className={`uline-tab ${clinicalTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setClinicalTab('overview')}
                  >
                    Summary &amp; Logs
                  </button>
                  <button
                    type="button"
                    className={`uline-tab ${clinicalTab === 'careplan' ? 'active' : ''}`}
                    onClick={() => setClinicalTab('careplan')}
                  >
                    Assign Care Plan
                  </button>
                  <button
                    type="button"
                    className={`uline-tab ${clinicalTab === 'report' ? 'active' : ''}`}
                    onClick={() => setClinicalTab('report')}
                  >
                    Publish Report
                  </button>
                </div>

                {clinicalTab === 'overview' && (
                  <div className="surface-pad">
                    <div className="vitals-bar">
                      <div className="vital-cell">
                        <span>Cycle Day</span>
                        <strong>{cycleDay}</strong>
                      </div>
                      <div className="vital-cell">
                        <span>Last Period</span>
                        <strong>{selectedPatient.cycle?.last_period || '—'}</strong>
                      </div>
                      <div className="vital-cell">
                        <span>Latest Mood</span>
                        <strong>
                          {latestMood ? `${latestMood.mood}${latestMood.energy ? ` (${latestMood.energy}/10)` : ''}` : '—'}
                        </strong>
                      </div>
                      <div className="vital-cell">
                        <span>Flow &amp; Pain</span>
                        <strong>
                          {latestSymptom
                            ? `${latestSymptom.flow || '—'} · ${latestSymptom.pain ?? 0}/10${
                                latestSymptom.symptoms?.length ? ` (${latestSymptom.symptoms.join(', ')})` : ''
                              }`
                            : '—'}
                        </strong>
                      </div>
                    </div>

                    <div className="cols-2">
                      <div className="col-pane">
                        <div className="sec-lbl">Active Care Plans</div>
                        {selectedPatient.care_plans?.length ? (
                          selectedPatient.care_plans.map((cp) => (
                            <div key={cp.id} className="flat-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                              <div>
                                <strong>{cp.title}</strong>
                                <div className="ws-sub">{cp.category} · {cp.frequency}</div>
                                {cp.notes && <div className="ws-sub">{cp.notes}</div>}
                              </div>
                              <button
                                type="button"
                                className="ws-btn"
                                style={{ height: 24, padding: '0 8px', fontSize: '0.75rem', flexShrink: 0 }}
                                title="Remove care plan"
                                onClick={() => handleDeleteCarePlan(cp.id)}
                              >
                                Remove
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="flat-row">
                            <span className="ws-sub">No active care plans.</span>
                          </div>
                        )}

                        <div className="sec-lbl" style={{ marginTop: 16 }}>PCOS Habits Summary</div>
                        <div className="flat-row">
                          {selectedPatient.pcos_habits ? (
                            <div className="ws-sub">
                              Sleep: {selectedPatient.pcos_habits.sleep_hours ?? '—'}h ·
                              Steps: {selectedPatient.pcos_habits.steps ?? '—'} ·
                              Water: {selectedPatient.pcos_habits.water_liters ?? '—'}L ·
                              Stress: {selectedPatient.pcos_habits.stress_level ?? '—'}/10
                            </div>
                          ) : (
                            <span className="ws-sub">No PCOS habit logs recorded.</span>
                          )}
                        </div>
                      </div>

                      <div className="col-pane">
                        <div className="sec-lbl">Published Reports</div>
                        {selectedPatient.reports?.length ? (
                          selectedPatient.reports.map((rep) => (
                            <div key={rep.id} className="flat-row">
                              <div style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                  <strong>{rep.title}</strong>
                                  <span className={rep.status === 'Normal' ? 'badge-ok' : 'badge-warn'}>
                                    {rep.status}
                                  </span>
                                </div>
                                <div className="ws-sub">{rep.date} · {rep.summary}</div>
                                {rep.plain_explanation && (
                                  <div className="ws-sub">{rep.plain_explanation}</div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flat-row">
                            <span className="ws-sub">No reports published yet.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {clinicalTab === 'careplan' && (
                  <div className="surface-pad">
                    <form className="compact-form" onSubmit={handleCreateCarePlan}>
                      <div className="sec-lbl">Assign Care Plan &amp; Sync Reminder</div>
                      <label>
                        Title
                        <input
                          type="text"
                          value={cpTitle}
                          onChange={(e) => setCpTitle(e.target.value)}
                          placeholder="e.g. Metformin 500mg"
                          required
                        />
                      </label>
                      <label>
                        Category
                        <select value={cpCategory} onChange={(e) => setCpCategory(e.target.value)}>
                          <option value="Medication">Medication</option>
                          <option value="Supplement">Supplement</option>
                          <option value="Lifestyle">Lifestyle</option>
                          <option value="Lab Follow-up">Lab Follow-up</option>
                        </select>
                      </label>
                      <label>
                        Frequency
                        <input
                          type="text"
                          value={cpFrequency}
                          onChange={(e) => setCpFrequency(e.target.value)}
                          placeholder="e.g. Once daily after dinner"
                          required
                        />
                      </label>
                      <label>
                        Clinical Notes
                        <textarea
                          rows={3}
                          value={cpNotes}
                          onChange={(e) => setCpNotes(e.target.value)}
                          placeholder="Instructions for the patient..."
                        />
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button type="submit" className="ws-btn pri">Assign Care Plan</button>
                        {cpStatus && <span className="ws-sub">{cpStatus}</span>}
                      </div>
                    </form>
                  </div>
                )}

                {clinicalTab === 'report' && (
                  <div className="surface-pad">
                    <form className="compact-form" onSubmit={handlePublishReport}>
                      <div className="sec-lbl">Publish Clinical Report</div>
                      <label>
                        Report Title
                        <input
                          type="text"
                          value={repTitle}
                          onChange={(e) => setRepTitle(e.target.value)}
                          placeholder="e.g. Pelvic Ultrasound & Hormonal Panel"
                          required
                        />
                      </label>
                      <label>
                        Status
                        <select value={repStatus} onChange={(e) => setRepStatus(e.target.value)}>
                          <option value="Normal">Normal</option>
                          <option value="Attention">Attention</option>
                          <option value="Follow-up">Follow-up</option>
                        </select>
                      </label>
                      <label>
                        Clinical Summary
                        <textarea
                          rows={2}
                          value={repSummary}
                          onChange={(e) => setRepSummary(e.target.value)}
                          placeholder="Key lab findings..."
                          required
                        />
                      </label>
                      <label>
                        Plain-Language Explanation
                        <textarea
                          rows={2}
                          value={repPlain}
                          onChange={(e) => setRepPlain(e.target.value)}
                          placeholder="Patient-friendly explanation..."
                        />
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button type="submit" className="ws-btn pri">Publish Report</button>
                        {repMsg && <span className="ws-sub">{repMsg}</span>}
                      </div>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="surface">
          <div className="surface-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div className="sec-lbl">Appointments Queue</div>
              {apptMsg && <span className="ws-sub">{apptMsg}</span>}
            </div>
            {appointmentsList.length === 0 ? (
              <div className="ws-sub">No appointments scheduled.</div>
            ) : (
              appointmentsList.map((appt) => (
                <div key={appt.id} className="appt-row">
                  <div>
                    <strong>{appt.name}</strong>
                    <div className="ws-sub">{appt.phone}</div>
                  </div>
                  <div>
                    <div>{appt.service}</div>
                    {appt.notes && <div className="ws-sub">{appt.notes}</div>}
                  </div>
                  <div>
                    <div>{appt.date}</div>
                    <div className="ws-sub">{appt.mode}</div>
                  </div>
                  <div>
                    <span className={appt.status === 'Confirmed' || appt.status === 'Completed' ? 'badge-ok' : 'badge-warn'}>
                      {appt.status}
                    </span>
                  </div>
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
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
