import React, { useState, useEffect, useMemo } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete, getSession, setSession } from '../api.js';

const MODULES = [
  { id: '01', label: 'Period Tracking' },
  { id: '02', label: 'Am I Pregnant?' },
  { id: '03', label: 'Online Consultation' },
  { id: '04', label: 'Mood Tracking' },
  { id: '05', label: 'Medical History & Reports' },
  { id: '06', label: 'Flow, Pain & Symptoms' },
  { id: '07', label: 'Understanding Reports & Rx' },
  { id: '08', label: 'Appointment & Med Reminders' },
  { id: '09', label: 'Intimate Hygiene Education' },
  { id: '10', label: 'PCOS & PCOD Module' },
];

const PREG_SIGNS = [
  'Missed period (>5 days)',
  'Morning nausea',
  'Breast tenderness',
  'Fatigue',
  'Light spotting',
];

const CONSULT_SLOTS = [
  'Today · 4:30 PM IST (Video)',
  'Today · 7:15 PM IST (Audio)',
  'Tomorrow · 11:00 AM IST (Video)',
];

const MOODS = ['Calm', 'Energized', 'Fatigued', 'Anxious', 'Irritable', 'Low'];
const FLOWS = ['None', 'Spotting', 'Light', 'Medium', 'Heavy'];
const SYMPTOM_OPTIONS = ['Cramps', 'Bloating', 'Headache', 'Lower back ache', 'Acne', 'Hot flashes'];

const LAB_GLOSSARY = {
  AMH: {
    name: 'Anti-Müllerian Hormone (AMH)',
    range: '1.0 – 4.0 ng/mL (typical reproductive age)',
    note: 'Reflects ovarian reserve. Higher levels (>4.5 ng/mL) are commonly seen in PCOS; lower levels (<1.0 ng/mL) indicate reduced reserve.',
  },
  TSH: {
    name: 'Thyroid Stimulating Hormone (TSH)',
    range: '0.4 – 4.0 mIU/L',
    note: 'Regulates thyroid metabolism. Both hypothyroidism and hyperthyroidism can cause irregular cycles, fatigue, or fertility challenges.',
  },
  HbA1c: {
    name: 'Glycated Hemoglobin (HbA1c)',
    range: '< 5.7% (Normal) · 5.7–6.4% (Prediabetes)',
    note: 'Measures 3-month average blood sugar. Important in PCOS/PCOD because insulin resistance often drives androgen elevation.',
  },
  'USG Pelvis': {
    name: 'Pelvic Ultrasound (USG)',
    range: 'Imaging · Endometrial & ovarian morphology',
    note: 'Visualizes uterine lining thickness, ovarian volume, and follicle count to evaluate cysts, fibroids, or polycystic morphology.',
  },
};

const HYGIENE_CARDS = [
  {
    title: 'pH Balance',
    body: 'Healthy vaginal pH is mildly acidic (3.8–4.5). Use plain lukewarm water externally; avoid scented washes or internal douching.',
  },
  {
    title: 'Period Care',
    body: 'Change pads every 4–6 hours and tampons every 4–8 hours. Sanitize menstrual cups by boiling for 5 minutes between cycles.',
  },
  {
    title: 'Breathable Fabrics',
    body: 'Choose 100% cotton underwear and change out of damp workout clothes promptly to reduce moisture-related irritation.',
  },
  {
    title: 'When to Consult',
    body: 'Book a clinical review for sudden odor, itching, burning, pelvic pain, or unusual discharge color.',
  },
];

const PCOS_HABITS = [
  'Protein-first breakfast',
  '30 min brisk walk',
  '2.5L hydration',
  '8h sleep',
];

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(dateStr) {
  const start = new Date(dateStr);
  if (Number.isNaN(start.getTime())) return 1;
  const now = new Date();
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 1;
}

function getCyclePhase(day, len) {
  const ovulDay = Math.max(10, len - 14);
  if (day <= 5) return 'Menstrual';
  if (day < ovulDay - 1) return 'Follicular';
  if (day <= ovulDay + 1) return 'Ovulation';
  return 'Luteal';
}

function getPainMeta(pain) {
  if (pain <= 3) return { label: 'Mild', color: '#34d399' };
  if (pain <= 6) return { label: 'Moderate', color: '#fbbf24' };
  return { label: 'Severe', color: '#f87171' };
}

export default function PatientView() {
  const session = getSession();
  const patientId = session?.user?.id || '';
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMod, setActiveMod] = useState('01');

  // 01 Cycle State
  const [lastPeriod, setLastPeriod] = useState('2026-11-01');
  const [cycleLength, setCycleLength] = useState(28);
  const [cycleMsg, setCycleMsg] = useState('');

  // 02 Pregnancy Check State
  const [signs, setSigns] = useState([]);
  const [pregResult, setPregResult] = useState(null);

  // 03 Consultation State
  const [consultSlot, setConsultSlot] = useState(CONSULT_SLOTS[0]);
  const [consultDate, setConsultDate] = useState('2026-11-20');
  const [consultNotes, setConsultNotes] = useState('');
  const [consultMsg, setConsultMsg] = useState('');

  // 04 Mood State
  const [selectedMood, setSelectedMood] = useState('Calm');
  const [moodNote, setMoodNote] = useState('');
  const [moodMsg, setMoodMsg] = useState('');

  // 06 Flow & Symptoms State
  const [flow, setFlow] = useState('None');
  const [pain, setPain] = useState(0);
  const [symptoms, setSymptoms] = useState([]);
  const [symMsg, setSymMsg] = useState('');

  // 07 Glossary State
  const [activeTerm, setActiveTerm] = useState('AMH');

  // 08 Reminders State
  const [remName, setRemName] = useState('');
  const [remTime, setRemTime] = useState('');

  // 10 PCOS State
  const [pcosHabits, setPcosHabits] = useState([]);
  const [pcosMsg, setPcosMsg] = useState('');

  // Account Profile Edit State
  const [showAccountEdit, setShowAccountEdit] = useState(false);
  const [acctName, setAcctName] = useState('');
  const [acctPhone, setAcctPhone] = useState('');
  const [acctAge, setAcctAge] = useState('28');
  const [acctTag, setAcctTag] = useState('General');
  const [acctSaving, setAcctSaving] = useState(false);
  const [acctMsg, setAcctMsg] = useState('');
  const [acctErr, setAcctErr] = useState('');

  const loadProfile = async (id = patientId) => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const data = await apiGet(`/patient/profile?patient_id=${id}`);
      setProfile(data);
      if (data?.cycle) {
        setLastPeriod(data.cycle.last_period || '2026-11-01');
        setCycleLength(Number(data.cycle.cycle_length) || 28);
      }
      setPcosHabits(Array.isArray(data?.pcos_habits) ? data.pcos_habits : []);
      setAcctName(data?.name || '');
      setAcctPhone(data?.phone || '');
      setAcctAge(String(data?.age ?? 28));
      setAcctTag(['Antenatal', 'PCOS', 'Fertility', 'General'].includes(data?.tag) ? data.tag : 'General');
    } catch (err) {
      setError(err.message || 'Failed to load patient profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile(patientId);
  }, [patientId]);

  const handleSaveCycle = async (e) => {
    e.preventDefault();
    try {
      setCycleMsg('');
      const res = await apiPost('/patient/cycle', {
        patient_id: patientId,
        last_period: lastPeriod,
        cycle_length: Number(cycleLength),
      });
      setProfile((prev) => (prev ? { ...prev, cycle: res.cycle } : prev));
      setCycleMsg('Cycle updated');
    } catch (err) {
      setCycleMsg(err.message || 'Failed to save cycle');
    }
  };

  const handlePregCheck = async () => {
    try {
      const res = await apiPost('/patient/pregnancy-check', {
        patient_id: patientId,
        signs,
      });
      setPregResult(res);
    } catch (err) {
      setPregResult({
        recommendation: err.message || 'Unable to run check',
        disclaimer: 'Educational support only.',
      });
    }
  };

  const handleBookConsult = async (e) => {
    e.preventDefault();
    try {
      setConsultMsg('');
      const mode = consultSlot.includes('Audio') ? 'Audio' : 'Video';
      const res = await apiPost('/appointments', {
        patient_id: patientId,
        name: profile?.name || 'Patient',
        phone: profile?.phone || session?.user?.phone || '',
        service: consultSlot,
        date: consultDate,
        mode,
        notes: consultNotes,
      });
      setProfile((prev) =>
        prev
          ? { ...prev, appointments: [res.appointment, ...(prev.appointments || [])] }
          : prev
      );
      setConsultNotes('');
      setConsultMsg('Slot requested');
    } catch (err) {
      setConsultMsg(err.message || 'Booking failed');
    }
  };

  const handleLogMood = async (e) => {
    e.preventDefault();
    try {
      setMoodMsg('');
      const res = await apiPost('/patient/mood', {
        patient_id: patientId,
        mood: selectedMood,
        note: moodNote,
      });
      setProfile((prev) => (prev ? { ...prev, mood_logs: res.mood_logs } : prev));
      setMoodNote('');
      setMoodMsg('Mood logged');
    } catch (err) {
      setMoodMsg(err.message || 'Failed to log mood');
    }
  };

  const handleLogSymptoms = async (e) => {
    e.preventDefault();
    try {
      setSymMsg('');
      const res = await apiPost('/patient/symptoms', {
        patient_id: patientId,
        flow,
        pain: Number(pain),
        symptoms,
      });
      setProfile((prev) => (prev ? { ...prev, symptom_logs: res.symptom_logs } : prev));
      setSymMsg('Log saved');
    } catch (err) {
      setSymMsg(err.message || 'Failed to save log');
    }
  };

  const handleToggleReminder = async (reminderId) => {
    try {
      const res = await apiPost('/patient/reminders/toggle', {
        patient_id: patientId,
        reminder_id: reminderId,
      });
      setProfile((prev) => (prev ? { ...prev, reminders: res.reminders } : prev));
    } catch (err) {
      setError(err.message || 'Could not update reminder');
    }
  };

  const handleDeleteReminder = async (e, reminderId) => {
    e.stopPropagation();
    try {
      const res = await apiDelete(`/patient/reminders/${reminderId}?patient_id=${patientId}`);
      setProfile((prev) => (prev ? { ...prev, reminders: res.reminders } : prev));
    } catch (err) {
      setError(err.message || 'Could not delete reminder');
    }
  };

  const handleAddReminder = async (e) => {
    e.preventDefault();
    if (!remName.trim()) return;
    try {
      const res = await apiPost('/patient/reminders', {
        patient_id: patientId,
        name: remName.trim(),
        time: remTime.trim() || '09:00 AM',
      });
      setProfile((prev) => (prev ? { ...prev, reminders: res.reminders } : prev));
      setRemName('');
      setRemTime('');
    } catch (err) {
      setError(err.message || 'Could not add reminder');
    }
  };

  const handleTogglePcosHabit = async (habit) => {
    const next = pcosHabits.includes(habit)
      ? pcosHabits.filter((h) => h !== habit)
      : [...pcosHabits, habit];
    setPcosHabits(next);
    try {
      setPcosMsg('');
      const res = await apiPost('/patient/pcos', {
        patient_id: patientId,
        habits: next,
      });
      setProfile((prev) => (prev ? { ...prev, pcos_habits: res.pcos_habits } : prev));
      setPcosMsg('Saved');
    } catch (err) {
      setPcosMsg(err.message || 'Save failed');
    }
  };

  const toggleArrayItem = (arr, setArr, item) => {
    setArr(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
  };

  const handleToggleAccountEdit = () => {
    if (!showAccountEdit) {
      const currentTag = profile?.tag || session?.user?.tag || 'General';
      setAcctName(profile?.name || session?.user?.name || '');
      setAcctPhone(profile?.phone || session?.user?.phone || '');
      setAcctAge(String(profile?.age ?? session?.user?.age ?? 28));
      setAcctTag(['Antenatal', 'PCOS', 'Fertility', 'General'].includes(currentTag) ? currentTag : 'General');
      setAcctErr('');
    }
    setShowAccountEdit((prev) => !prev);
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    try {
      setAcctSaving(true);
      setAcctErr('');
      setAcctMsg('');
      const res = await apiPatch('/auth/profile', {
        name: acctName.trim(),
        phone: acctPhone.trim(),
        age: Number(acctAge),
        tag: acctTag,
      });
      if (res?.user) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                name: res.user.name,
                phone: res.user.phone,
                age: res.user.age,
                tag: res.user.tag,
              }
            : res.user
        );
        const currentSession = getSession();
        if (currentSession) {
          setSession({ ...currentSession, user: res.user });
        }
      }
      setAcctMsg('Profile updated');
      setShowAccountEdit(false);
      setTimeout(() => setAcctMsg(''), 4000);
    } catch (err) {
      setAcctErr(err.message || 'Failed to update profile');
    } finally {
      setAcctSaving(false);
    }
  };

  const cycleMetrics = useMemo(() => {
    const len = Number(cycleLength) || 28;
    const rawDay = daysBetween(lastPeriod);
    const day = ((rawDay - 1) % len) + 1;
    const radius = 50;
    const circ = 2 * Math.PI * radius;
    const progress = Math.min(1, Math.max(0.05, day / len));
    const offset = circ * (1 - progress);
    const nextPeriod = addDays(lastPeriod, len);
    const fertileStart = addDays(lastPeriod, Math.max(1, len - 18));
    const fertileEnd = addDays(lastPeriod, Math.max(2, len - 12));
    const phase = getCyclePhase(day, len);
    return { day, len, circ, offset, nextPeriod, fertileStart, fertileEnd, phase };
  }, [lastPeriod, cycleLength]);

  const reminders = profile?.reminders || [];
  const doneReminders = reminders.filter((r) => r.done).length;
  const remPct = reminders.length ? Math.round((doneReminders / reminders.length) * 100) : 0;
  const pcosPct = Math.round((pcosHabits.length / PCOS_HABITS.length) * 100);
  const painMeta = getPainMeta(pain);

  return (
    <div className="ws-wrap">
      {/* Compact Header */}
      <div className="ws-bar">
        <div>
          <h1 className="ws-title">
            {profile?.name || 'User Workspace'}
          </h1>
          <div className="ws-sub" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>
              {profile?.age ? `${profile.age} yrs · ` : ''}
              {profile?.summary || 'Women’s Health & Cycle Care'}
            </span>
            {profile?.tag && <span className="badge-plum">{profile.tag}</span>}
          </div>
        </div>

        <div className="ws-actions">
          {acctMsg && <span className="badge-ok">{acctMsg}</span>}
          <button
            type="button"
            className={`ws-btn${showAccountEdit ? ' pri' : ''}`}
            onClick={handleToggleAccountEdit}
          >
            Edit Account
          </button>
          <button
            type="button"
            className="ws-btn"
            onClick={() => loadProfile(patientId)}
          >
            Refresh
          </button>

          {showAccountEdit && (
            <form className="otp-pop" onSubmit={handleSaveAccount}>
              <div className="sec-lbl" style={{ marginBottom: 10 }}>
                <span>Account Profile</span>
              </div>
              {acctErr && (
                <div className="badge-warn" style={{ marginBottom: 10, width: '100%', height: 'auto', padding: '5px 8px' }}>
                  {acctErr}
                </div>
              )}
              <div className="field-group">
                <label htmlFor="patient-acct-name">Full Name</label>
                <input
                  id="patient-acct-name"
                  type="text"
                  value={acctName}
                  onChange={(e) => setAcctName(e.target.value)}
                  required
                />
              </div>
              <div className="field-group">
                <label htmlFor="patient-acct-phone">Phone</label>
                <input
                  id="patient-acct-phone"
                  type="tel"
                  inputMode="tel"
                  maxLength={14}
                  value={acctPhone}
                  onChange={(e) => setAcctPhone(e.target.value)}
                  required
                />
              </div>
              <div className="field-group">
                <label htmlFor="patient-acct-age">Age</label>
                <input
                  id="patient-acct-age"
                  type="number"
                  min={12}
                  max={100}
                  value={acctAge}
                  onChange={(e) => setAcctAge(e.target.value)}
                  required
                />
              </div>
              <div className="field-group">
                <label htmlFor="patient-acct-tag">Care Focus</label>
                <select
                  id="patient-acct-tag"
                  value={acctTag}
                  onChange={(e) => setAcctTag(e.target.value)}
                >
                  <option value="Antenatal">Antenatal</option>
                  <option value="PCOS">PCOS</option>
                  <option value="Fertility">Fertility</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="submit"
                  className="ws-btn pri"
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={acctSaving}
                >
                  {acctSaving ? 'Saving...' : 'Save Profile'}
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

      {/* 4-Column Patient Snapshot Strip */}
      <div className="seg-kpis">
        <div className="seg-kpi">
          <div className="seg-kpi-lbl">Cycle Status</div>
          <div className="seg-kpi-val">Day {cycleMetrics.day} of {cycleMetrics.len}</div>
        </div>
        <div className="seg-kpi">
          <div className="seg-kpi-lbl">Next Period</div>
          <div className="seg-kpi-val">{cycleMetrics.nextPeriod}</div>
        </div>
        <div className="seg-kpi">
          <div className="seg-kpi-lbl">Latest Mood</div>
          <div className="seg-kpi-val">{profile?.mood_logs?.[0]?.mood || 'Not logged'}</div>
        </div>
        <div className="seg-kpi">
          <div className="seg-kpi-lbl">Daily Reminders</div>
          <div className="seg-kpi-val">{doneReminders} / {reminders.length} Done</div>
        </div>
      </div>

      {/* Synced Care Plan Section */}
      <div style={{ marginBottom: 16 }}>
        <div className="sec-lbl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span>SYNCED CARE PLAN · DR. SARAH JENKINS</span>
          <span className="badge-ok">Live Clinic Sync</span>
        </div>
        {(profile?.care_plans || []).length === 0 ? (
          <div className="mini ws-sub">No active care orders from Dr. Sarah Jenkins.</div>
        ) : (
          <div className="care-grid">
            {profile.care_plans.map((cp) => (
              <div key={cp.id} className="care-card">
                <div className="care-card-top">
                  <span className="care-card-title">{cp.title}</span>
                  <span className="badge-plum">{cp.category}</span>
                </div>
                {cp.notes && (
                  <p className="ws-sub" style={{ marginTop: 4 }}>{cp.notes}</p>
                )}
                <div className="care-card-meta">
                  <span>{cp.frequency}</span>
                  <span>{cp.assigned_by || 'Dr. Sarah Jenkins'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div className="badge-warn" style={{ marginBottom: 12 }}>{error}</div>}

      {/* Compact 2-Pane 10-Module Workspace */}
      <div className="mod-shell">
        <aside className="mod-side">
          {MODULES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`mod-item${activeMod === m.id ? ' on' : ''}`}
              onClick={() => setActiveMod(m.id)}
            >
              <span className="mod-idx">{m.id}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </aside>

        <section className="mod-pane">
          {loading && !profile ? (
            <div className="mod-content ws-sub">Loading patient workspace…</div>
          ) : (
            <>
              {/* 01 Period Tracking */}
              {activeMod === '01' && (
                <>
                  <div className="mod-head">
                    <div>
                      <h2>01 · Period Tracking</h2>
                      <div className="ws-sub">Cycle length, fertile window, and phase overview</div>
                    </div>
                    {cycleMsg && <span className="badge-ok">{cycleMsg}</span>}
                  </div>
                  <div className="mod-content">
                    <div className="split-2">
                      <div className="mini">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div className="ring-sm">
                            <svg width="124" height="124" viewBox="0 0 124 124">
                              <defs>
                                <linearGradient id="gyneRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#a83b7f" />
                                  <stop offset="100%" stopColor="#e07ab8" />
                                </linearGradient>
                              </defs>
                              <circle className="ring-bg" cx="62" cy="62" r="50" />
                              <circle
                                className="ring-fg"
                                cx="62"
                                cy="62"
                                r="50"
                                stroke="url(#gyneRingGrad)"
                                strokeDasharray={cycleMetrics.circ}
                                strokeDashoffset={cycleMetrics.offset}
                                transform="rotate(-90 62 62)"
                              />
                            </svg>
                            <div className="ring-center">
                              <small>Day</small>
                              <strong>{cycleMetrics.day}</strong>
                              <span>of {cycleMetrics.len}</span>
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div className="kv-row">
                              <span>Next Period</span>
                              <strong>{cycleMetrics.nextPeriod}</strong>
                            </div>
                            <div className="kv-row">
                              <span>Fertile Window</span>
                              <strong>{cycleMetrics.fertileStart} – {cycleMetrics.fertileEnd}</strong>
                            </div>
                            <div className="kv-row">
                              <span>Current Phase</span>
                              <span className="badge-plum">{cycleMetrics.phase}</span>
                            </div>
                          </div>
                        </div>

                        <div className="phase-bar" style={{ marginTop: 14 }}>
                          <div className="ph-m" style={{ width: '18%' }} />
                          <div className="ph-f" style={{ width: '32%' }} />
                          <div className="ph-o" style={{ width: '10%' }} />
                          <div className="ph-l" style={{ width: '40%' }} />
                        </div>
                        <div className="phase-legend">
                          <span>Menstrual</span>
                          <span>Follicular</span>
                          <span>Ovulation</span>
                          <span>Luteal</span>
                        </div>
                      </div>

                      <form className="mini" onSubmit={handleSaveCycle}>
                        <div className="field-group">
                          <label>Last Period Start</label>
                          <input
                            type="date"
                            value={lastPeriod}
                            onChange={(e) => setLastPeriod(e.target.value)}
                          />
                        </div>
                        <div className="field-group">
                          <label>Cycle Length (days)</label>
                          <input
                            type="number"
                            min="18"
                            max="60"
                            value={cycleLength}
                            onChange={(e) => setCycleLength(e.target.value)}
                          />
                        </div>
                        <button type="submit" className="ws-btn pri">
                          Save Cycle
                        </button>
                      </form>
                    </div>
                  </div>
                </>
              )}

              {/* 02 Am I Pregnant? */}
              {activeMod === '02' && (
                <>
                  <div className="mod-head">
                    <div>
                      <h2>02 · Am I Pregnant?</h2>
                      <div className="ws-sub">Early sign checklist and educational guidance</div>
                    </div>
                  </div>
                  <div className="mod-content">
                    <p className="ws-sub" style={{ marginBottom: 10 }}>
                      Select any early signs you are experiencing for educational guidance:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {PREG_SIGNS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`mini-pill${signs.includes(s) ? ' on' : ''}`}
                          onClick={() => toggleArrayItem(signs, setSigns, s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <button type="button" className="ws-btn pri" onClick={handlePregCheck}>
                        Check Guidance
                      </button>
                    </div>

                    {pregResult && (
                      <div className="mini" style={{ marginTop: 12 }}>
                        <b>Guidance ({pregResult.signs_count ?? signs.length} signs)</b>
                        <p style={{ marginTop: 6 }}>{pregResult.recommendation}</p>
                      </div>
                    )}

                    <div className="callout-note" style={{ marginTop: 12 }}>
                      <span className="badge-warn">Non-Diagnostic</span>
                      <p style={{ marginTop: 6 }}>
                        Educational support only — this does not replace a home urine hCG test,
                        serum beta-hCG blood test, or clinical consultation.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* 03 Online Consultation */}
              {activeMod === '03' && (
                <>
                  <div className="mod-head">
                    <div>
                      <h2>03 · Online Consultation</h2>
                      <div className="ws-sub">Book video or audio follow-ups with Dr. Sarah Jenkins</div>
                    </div>
                    {consultMsg && <span className="badge-ok">{consultMsg}</span>}
                  </div>
                  <div className="mod-content">
                    <div className="split-2">
                      <form className="mini" onSubmit={handleBookConsult}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                          {CONSULT_SLOTS.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              className={`mini-pill${consultSlot === slot ? ' on' : ''}`}
                              onClick={() => setConsultSlot(slot)}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                        <div className="field-group">
                          <label>Preferred Date</label>
                          <input
                            type="date"
                            value={consultDate}
                            onChange={(e) => setConsultDate(e.target.value)}
                          />
                        </div>
                        <div className="field-group">
                          <label>Notes for Dr. Sarah Jenkins</label>
                          <input
                            type="text"
                            value={consultNotes}
                            onChange={(e) => setConsultNotes(e.target.value)}
                            placeholder="Brief concern or follow-up topic"
                          />
                        </div>
                        <button type="submit" className="ws-btn pri">
                          Book Online Slot
                        </button>
                      </form>

                      <div className="mini">
                        <b>Your Appointments</b>
                        <div style={{ marginTop: 8 }}>
                          {(profile?.appointments || []).length === 0 ? (
                            <div className="ws-sub">No appointments booked yet.</div>
                          ) : (
                            profile.appointments.map((apt) => (
                              <div key={apt.id} className="kv-row">
                                <div>
                                  <strong>{apt.service}</strong>
                                  <div className="ws-sub">
                                    {apt.date} · {apt.mode}
                                  </div>
                                </div>
                                <span
                                  className={
                                    apt.status === 'Confirmed' ? 'badge-ok' : 'badge-warn'
                                  }
                                >
                                  {apt.status}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* 04 Mood Tracking */}
              {activeMod === '04' && (
                <>
                  <div className="mod-head">
                    <div>
                      <h2>04 · Mood Tracking</h2>
                      <div className="ws-sub">Daily emotional check-ins and energy patterns</div>
                    </div>
                    {moodMsg && <span className="badge-ok">{moodMsg}</span>}
                  </div>
                  <div className="mod-content">
                    <form className="mini" onSubmit={handleLogMood}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                        {MOODS.map((m) => (
                          <button
                            key={m}
                            type="button"
                            className={`mini-pill${selectedMood === m ? ' on' : ''}`}
                            onClick={() => setSelectedMood(m)}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="text"
                          value={moodNote}
                          onChange={(e) => setMoodNote(e.target.value)}
                          placeholder="Optional note (sleep, stress, energy)..."
                        />
                        <button type="submit" className="ws-btn pri">
                          Log Mood
                        </button>
                      </div>
                    </form>

                    <div className="sec-lbl" style={{ marginTop: 14, marginBottom: 6 }}>
                      RECENT MOOD LOGS
                    </div>
                    <div className="mini">
                      {(profile?.mood_logs || []).length === 0 ? (
                        <div className="ws-sub">No mood logs recorded yet.</div>
                      ) : (
                        profile.mood_logs.slice(0, 6).map((ml) => (
                          <div key={ml.id} className="kv-row">
                            <div>
                              <strong>{ml.mood}</strong>
                              {ml.note && <span className="ws-sub"> · {ml.note}</span>}
                            </div>
                            <span className="ws-sub">{ml.timestamp}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* 05 Medical History & Reports */}
              {activeMod === '05' && (
                <>
                  <div className="mod-head">
                    <div>
                      <h2>05 · Medical History &amp; Reports</h2>
                      <div className="ws-sub">Uploaded scans, lab panels, and clinician notes</div>
                    </div>
                  </div>
                  <div className="mod-content">
                    {(profile?.reports || []).length === 0 ? (
                      <div className="mini ws-sub">No clinical reports uploaded yet.</div>
                    ) : (
                      profile.reports.map((rep) => (
                        <div key={rep.id} className="flat-row" style={{ alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                              <strong>{rep.title}</strong>
                              <span className={rep.status === 'Normal' ? 'badge-ok' : 'badge-warn'}>
                                {rep.status || 'Reviewed'}
                              </span>
                            </div>
                            <div className="ws-sub">{rep.date}</div>
                            <p style={{ marginTop: 6 }}>{rep.summary}</p>
                            {(rep.plain_explanation || rep.plain_language) && (
                              <div className="callout-note" style={{ marginTop: 8 }}>
                                <span className="ws-sub">
                                  Plain-language note: {rep.plain_explanation || rep.plain_language}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* 06 Flow, Pain & Symptoms */}
              {activeMod === '06' && (
                <>
                  <div className="mod-head">
                    <div>
                      <h2>06 · Flow, Pain &amp; Symptoms</h2>
                      <div className="ws-sub">Track bleeding intensity, pain score, and physical symptoms</div>
                    </div>
                    {symMsg && <span className="badge-ok">{symMsg}</span>}
                  </div>
                  <div className="mod-content">
                    <form className="mini" onSubmit={handleLogSymptoms}>
                      <div className="field-group">
                        <label>Flow</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {FLOWS.map((f) => (
                            <button
                              key={f}
                              type="button"
                              className={`mini-pill${flow === f ? ' on' : ''}`}
                              onClick={() => setFlow(f)}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="field-group">
                        <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Pain Level: {pain} / 10</span>
                          <span style={{ color: painMeta.color, fontWeight: 600 }}>{painMeta.label}</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={pain}
                          onChange={(e) => setPain(Number(e.target.value))}
                          style={{ accentColor: painMeta.color }}
                        />
                      </div>

                      <div className="field-group">
                        <label>Symptoms</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {SYMPTOM_OPTIONS.map((sym) => (
                            <button
                              key={sym}
                              type="button"
                              className={`mini-pill${symptoms.includes(sym) ? ' on' : ''}`}
                              onClick={() => toggleArrayItem(symptoms, setSymptoms, sym)}
                            >
                              {sym}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button type="submit" className="ws-btn pri">
                        Save Log
                      </button>
                    </form>

                    <div className="sec-lbl" style={{ marginTop: 14, marginBottom: 6 }}>
                      RECENT SYMPTOM LOGS
                    </div>
                    <div className="mini">
                      {(profile?.symptom_logs || []).length === 0 ? (
                        <div className="ws-sub">No symptom logs recorded yet.</div>
                      ) : (
                        profile.symptom_logs.slice(0, 5).map((sl) => (
                          <div key={sl.id} className="kv-row">
                            <div>
                              <strong>Flow: {sl.flow}</strong> · Pain {sl.pain}/10
                              {sl.symptoms?.length > 0 && (
                                <span className="ws-sub"> · {sl.symptoms.join(', ')}</span>
                              )}
                            </div>
                            <span className="ws-sub">{sl.timestamp}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* 07 Understanding Reports & Rx */}
              {activeMod === '07' && (
                <>
                  <div className="mod-head">
                    <div>
                      <h2>07 · Understanding Reports &amp; Rx</h2>
                      <div className="ws-sub">Plain-language lab glossary and report explanations</div>
                    </div>
                  </div>
                  <div className="mod-content">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                      {Object.keys(LAB_GLOSSARY).map((term) => (
                        <button
                          key={term}
                          type="button"
                          className={`mini-pill${activeTerm === term ? ' on' : ''}`}
                          onClick={() => setActiveTerm(term)}
                        >
                          {term}
                        </button>
                      ))}
                    </div>

                    <div className="mini" style={{ marginBottom: 12 }}>
                      <b>{LAB_GLOSSARY[activeTerm].name}</b>
                      <div className="ws-sub" style={{ marginTop: 4 }}>
                        Reference: {LAB_GLOSSARY[activeTerm].range}
                      </div>
                      <p style={{ marginTop: 6 }}>{LAB_GLOSSARY[activeTerm].note}</p>
                    </div>

                    <div className="mini">
                      <b>Doctor Plain-Language Report Notes</b>
                      <div style={{ marginTop: 8 }}>
                        {(profile?.reports || []).length === 0 ? (
                          <div className="ws-sub">No report notes available.</div>
                        ) : (
                          profile.reports.map((rep) => (
                            <div key={rep.id} className="kv-row">
                              <div>
                                <strong>{rep.title}</strong>
                                <div className="ws-sub">
                                  {rep.plain_explanation || rep.plain_language || rep.summary}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* 08 Appointment & Med Reminders */}
              {activeMod === '08' && (
                <>
                  <div className="mod-head">
                    <div>
                      <h2>08 · Appointment &amp; Med Reminders</h2>
                      <div className="ws-sub">
                        {doneReminders}/{reminders.length} completed ({remPct}%)
                      </div>
                    </div>
                  </div>
                  <div className="mod-content">
                    <div className="bar" style={{ marginBottom: 12 }}>
                      <i style={{ width: `${remPct}%` }} />
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      {reminders.length === 0 ? (
                        <div className="mini ws-sub">No reminders scheduled yet.</div>
                      ) : (
                        reminders.map((r) => (
                          <div
                            key={r.id}
                            className="rem-item"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleToggleReminder(r.id)}
                          >
                            <div>
                              <strong style={{ textDecoration: r.done ? 'line-through' : 'none' }}>
                                {r.name}
                              </strong>
                              <div className="ws-sub">{r.time}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className={r.done ? 'badge-ok' : 'badge-warn'}>
                                {r.done ? 'Done' : 'Pending'}
                              </span>
                              <button
                                type="button"
                                className="ws-btn"
                                style={{ padding: '0 8px', height: 24, fontSize: '0.85rem', lineHeight: 1 }}
                                title="Delete reminder"
                                onClick={(e) => handleDeleteReminder(e, r.id)}
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <form style={{ display: 'flex', gap: 8, alignItems: 'center' }} onSubmit={handleAddReminder}>
                      <input
                        type="text"
                        value={remName}
                        onChange={(e) => setRemName(e.target.value)}
                        placeholder="Medication or appointment name"
                      />
                      <input
                        type="text"
                        value={remTime}
                        onChange={(e) => setRemTime(e.target.value)}
                        placeholder="09:00 AM"
                        style={{ maxWidth: 130 }}
                      />
                      <button type="submit" className="ws-btn pri">
                        Add
                      </button>
                    </form>
                  </div>
                </>
              )}

              {/* 09 Intimate Hygiene Education */}
              {activeMod === '09' && (
                <>
                  <div className="mod-head">
                    <div>
                      <h2>09 · Intimate Hygiene Education</h2>
                      <div className="ws-sub">Evidence-based daily care and clinical red flags</div>
                    </div>
                  </div>
                  <div className="mod-content">
                    <div className="split-2">
                      {HYGIENE_CARDS.map((card) => (
                        <div key={card.title} className="mini">
                          <b>{card.title}</b>
                          <p style={{ marginTop: 6 }}>{card.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* 10 PCOS & PCOD Module */}
              {activeMod === '10' && (
                <>
                  <div className="mod-head">
                    <div>
                      <h2>10 · PCOS &amp; PCOD Module</h2>
                      <div className="ws-sub">Metabolic habit tracking and endocrine reference</div>
                    </div>
                    {pcosMsg && <span className="badge-ok">{pcosMsg}</span>}
                  </div>
                  <div className="mod-content">
                    <div className="mini" style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <b>Daily Metabolic &amp; Cycle Habits</b>
                        <span className="ws-sub">{pcosHabits.length}/{PCOS_HABITS.length} ({pcosPct}%)</span>
                      </div>
                      <div className="bar" style={{ marginBottom: 10 }}>
                        <i style={{ width: `${pcosPct}%` }} />
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {PCOS_HABITS.map((h) => (
                          <button
                            key={h}
                            type="button"
                            className={`mini-pill${pcosHabits.includes(h) ? ' on' : ''}`}
                            onClick={() => handleTogglePcosHabit(h)}
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="split-2">
                      <div className="mini">
                        <b>Endocrine Targets</b>
                        <div className="kv-row" style={{ marginTop: 8 }}>
                          <span>Insulin Sensitivity</span>
                          <span className="badge-ok">Low-GI Meals</span>
                        </div>
                        <div className="kv-row">
                          <span>Androgen Balance</span>
                          <span className="badge-plum">Strength + Walk</span>
                        </div>
                        <div className="kv-row">
                          <span>Cortisol Recovery</span>
                          <span className="badge-ok">8h Sleep</span>
                        </div>
                      </div>

                      <div className="mini">
                        <b>Key Endocrine Labs Summary</b>
                        <div style={{ marginTop: 8 }}>
                          {(profile?.reports || []).length === 0 ? (
                            <div className="ws-sub">No endocrine labs on file yet.</div>
                          ) : (
                            profile.reports.map((rep) => (
                              <div key={rep.id} className="kv-row">
                                <span>{rep.title}</span>
                                <span className={rep.status === 'Normal' ? 'badge-ok' : 'badge-warn'}>
                                  {rep.status || 'Reviewed'}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>

      {/* Bottom Disclaimer */}
      <div className="disc-bar">
        Educational support only — GynAura&apos;s AI health guidance and pregnancy features do not
        replace medical diagnosis, clinical consultation, or pregnancy testing.
      </div>
    </div>
  );
}
