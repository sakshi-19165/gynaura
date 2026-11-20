import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPatch, apiDelete, getSession, setSession, clearSession } from '../api.js';
import { Icon, I } from '../components/Icons.jsx';

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
    standard: 'pH 3.8 – 4.5',
    body: 'Healthy vaginal pH is mildly acidic (3.8–4.5). Use plain lukewarm water externally; avoid scented washes or internal douching.',
    target: 'External lukewarm water only',
  },
  {
    title: 'Period Care',
    standard: '4 – 6 hr Interval',
    body: 'Change pads every 4–6 hours and tampons every 4–8 hours. Sanitize menstrual cups by boiling for 5 minutes between cycles.',
    target: '5m cup boil between cycles',
  },
  {
    title: 'Breathable Fabrics',
    standard: '100% Cotton',
    body: 'Choose 100% cotton underwear and change out of damp workout clothes promptly to reduce moisture-related irritation.',
    target: 'Prompt dry change post-workout',
  },
  {
    title: 'When to Consult',
    standard: 'Urgent Triage',
    body: 'Book a clinical review for sudden odor, itching, burning, pelvic pain, or unusual discharge color.',
    target: 'Prompt assessment on red flags',
  },
];

const PCOS_HABITS = [
  { name: 'Protein-first breakfast', target: 'Stabilize morning glucose & insulin response' },
  { name: '30 min brisk walk', target: 'Improve insulin sensitivity & androgen balance' },
  { name: '2.5L hydration', target: 'Support metabolic clearance & daily energy' },
  { name: '8h sleep', target: 'Regulate cortisol & ovulatory hormone rhythm' },
];

const PCOS_HABIT_NAMES = PCOS_HABITS.map((h) => h.name);

function getTimeGreeting() {
  const hr = new Date().getHours();
  if (hr < 12) return 'Good morning';
  if (hr < 17) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatShortDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr || '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysBetween(dateStr, refDate = new Date()) {
  const start = new Date(dateStr);
  if (Number.isNaN(start.getTime())) return 1;
  const diff = Math.floor((refDate - start) / (1000 * 60 * 60 * 24)) + 1;
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
  if (pain <= 3) return { label: 'Mild', color: '#34d399', badge: 'badge-ok' };
  if (pain <= 6) return { label: 'Moderate', color: '#fbbf24', badge: 'badge-warn' };
  return { label: 'Severe', color: '#f87171', badge: 'badge-warn' };
}

function getCycleContextForTimestamp(lastPeriod, len, timestamp) {
  const safeLen = Number(len) || 28;
  const parsed = timestamp ? new Date(String(timestamp).replace(' ', 'T')) : new Date();
  const ref = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const rawDay = daysBetween(lastPeriod, ref);
  const day = ((rawDay - 1) % safeLen) + 1;
  return `Day ${day} · ${getCyclePhase(day, safeLen)}`;
}

const SIDEBAR_GROUPS = [
  {
    group: 'Care Workspace',
    items: [
      { id: 'overview', label: 'Care Plan & Overview', sub: 'Orders, summary & tasks', shortLabel: 'Overview', icon: I.heart },
      { id: 'cycle', label: 'Cycle & Fertility', sub: 'Ovulation & early signs', shortLabel: 'Cycle', icon: I.wave },
      { id: 'daily', label: 'Daily Logs & Habits', sub: 'Flow, pain, mood & PCOS', shortLabel: 'Daily Logs', icon: I.check },
      { id: 'records', label: 'Lab Vault & Glossary', sub: 'Scans, panels & terms', shortLabel: 'Labs', icon: I.flask },
      { id: 'visits', label: 'Consults & Reminders', sub: 'Tele-visits & schedule', shortLabel: 'Visits', icon: I.cal },
      { id: 'guides', label: 'Clinical Education', sub: 'Hygiene & red-flag care', shortLabel: 'Guides', icon: I.shield },
    ],
  },
];

export default function PatientView() {
  const navigate = useNavigate();
  const session = getSession();
  const patientId = session?.user?.id || '';
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Mobile navigation drawer state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Consolidated Web-App Section + Sub-Tab state
  const [activeSection, setActiveSection] = useState('overview');
  const [cycleTab, setCycleTab] = useState('tracker'); // 'tracker' | 'pregnancy'
  const [dailyTab, setDailyTab] = useState('symptoms'); // 'symptoms' | 'mood' | 'pcos'
  const [recordsTab, setRecordsTab] = useState('reports'); // 'reports' | 'glossary'
  const [visitsTab, setVisitsTab] = useState('consults'); // 'consults' | 'reminders'

  // Theme state synced with document
  const [theme, setTheme] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('gynaura_theme') : null;
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gynaura_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const handleLogout = () => {
    apiPost('/auth/logout', {}).catch(() => {});
    clearSession();
    navigate('/login');
  };

  const selectSection = (id) => {
    setActiveSection(id);
    setSidebarOpen(false);
  };

  // Collapsible drawers
  const [showCycleDrawer, setShowCycleDrawer] = useState(false);
  const [showConsultDrawer, setShowConsultDrawer] = useState(false);
  const [showSymptomDrawer, setShowSymptomDrawer] = useState(false);

  // Cycle state
  const [lastPeriod, setLastPeriod] = useState('');
  const [cycleLength, setCycleLength] = useState(28);
  const [cycleMsg, setCycleMsg] = useState('');

  // Pregnancy check state
  const [signs, setSigns] = useState([]);
  const [pregResult, setPregResult] = useState(null);

  // Consultation state
  const [consultSlot, setConsultSlot] = useState(CONSULT_SLOTS[0]);
  const [consultDate, setConsultDate] = useState('2026-11-20');
  const [consultNotes, setConsultNotes] = useState('');
  const [consultMsg, setConsultMsg] = useState('');

  // Mood state
  const [selectedMood, setSelectedMood] = useState('Calm');
  const [moodNote, setMoodNote] = useState('');
  const [moodMsg, setMoodMsg] = useState('');

  // Flow & Symptoms state
  const [flow, setFlow] = useState('None');
  const [pain, setPain] = useState(0);
  const [symptoms, setSymptoms] = useState([]);
  const [symMsg, setSymMsg] = useState('');

  // Reminders state
  const [remName, setRemName] = useState('');
  const [remTime, setRemTime] = useState('');

  // PCOS state
  const [pcosHabits, setPcosHabits] = useState([]);
  const [pcosMsg, setPcosMsg] = useState('');

  // Account Profile state
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
      if (data?.cycle?.last_period) {
        setLastPeriod(data.cycle.last_period);
        setCycleLength(Number(data.cycle.cycle_length) || 28);
      } else {
        setLastPeriod('');
        setCycleLength(28);
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
      setShowCycleDrawer(false);
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
      setShowConsultDrawer(false);
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
      setShowSymptomDrawer(false);
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

  const handleOpenAccountView = () => {
    const currentTag = profile?.tag || session?.user?.tag || 'General';
    setAcctName(profile?.name || session?.user?.name || '');
    setAcctPhone(profile?.phone || session?.user?.phone || '');
    setAcctAge(String(profile?.age ?? session?.user?.age ?? 28));
    setAcctTag(['Antenatal', 'PCOS', 'Fertility', 'General'].includes(currentTag) ? currentTag : 'General');
    setAcctErr('');
    setActiveSection('account');
    setSidebarOpen(false);
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
      setTimeout(() => setAcctMsg(''), 4000);
    } catch (err) {
      setAcctErr(err.message || 'Failed to update profile');
    } finally {
      setAcctSaving(false);
    }
  };

  const hasCycle = Boolean(profile?.cycle?.last_period && lastPeriod);

  const cycleMetrics = useMemo(() => {
    if (!lastPeriod) {
      return {
        day: 0,
        len: Number(cycleLength) || 28,
        pct: 0,
        nextPeriod: '—',
        fertileStart: '—',
        fertileEnd: '—',
        phase: 'Not Set',
      };
    }
    const len = Number(cycleLength) || 28;
    const rawDay = daysBetween(lastPeriod);
    const day = ((rawDay - 1) % len) + 1;
    const pct = Math.min(100, Math.max(4, Math.round((day / len) * 100)));
    const nextPeriod = addDays(lastPeriod, len);
    const fertileStart = addDays(lastPeriod, Math.max(1, len - 18));
    const fertileEnd = addDays(lastPeriod, Math.max(2, len - 12));
    const phase = getCyclePhase(day, len);
    return { day, len, pct, nextPeriod, fertileStart, fertileEnd, phase };
  }, [lastPeriod, cycleLength]);

  const userName = profile?.name || session?.user?.name || 'Patient';
  const firstName = userName.split(/\s+/)[0] || 'Patient';
  const greeting = getTimeGreeting();
  const carePlans = profile?.care_plans || [];
  const reports = profile?.reports || [];
  const appointments = profile?.appointments || [];
  const reminders = profile?.reminders || [];
  const moodLogs = profile?.mood_logs || [];
  const symptomLogs = profile?.symptom_logs || [];

  const doneReminders = reminders.filter((r) => r.done).length;
  const remPct = reminders.length ? Math.round((doneReminders / reminders.length) * 100) : 0;
  const pcosPct = Math.round((pcosHabits.length / PCOS_HABIT_NAMES.length) * 100);
  const painMeta = getPainMeta(pain);

  const sectionCountMap = {
    overview: carePlans.length,
    cycle: hasCycle ? `D${cycleMetrics.day}` : '—',
    daily: symptomLogs.length + moodLogs.length,
    records: reports.length,
    visits: appointments.length + reminders.length,
    guides: HYGIENE_CARDS.length,
  };

  const activeSectionTitle = useMemo(() => {
    if (activeSection === 'account') return 'Account Profile';
    for (const grp of SIDEBAR_GROUPS) {
      const found = grp.items.find((i) => i.id === activeSection);
      if (found) return found.label;
    }
    return 'Care Plan & Overview';
  }, [activeSection]);

  const statusBadge = acctMsg || cycleMsg || consultMsg || moodMsg || symMsg || pcosMsg || error;

  const pendingReminder = reminders.find((r) => !r.done);
  const nextAppointment = appointments[0];
  const latestReport = reports[0];

  const mobileQuickItems = SIDEBAR_GROUPS[0].items.slice(0, 5);

  return (
    <div className="ws-wrap webapp-shell" style={{ maxWidth: '100%', margin: 0, padding: 0 }}>
      <a href="#user-workspace-heading" className="skip-link visually-hidden">
        Skip to workspace content
      </a>

      {/* Mobile Backdrop */}
      <div
        className={`webapp-backdrop${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Dedicated Standalone Left App Sidebar */}
      <aside className={`webapp-sidebar${sidebarOpen ? ' open' : ''}`} aria-label="User Workspace Sidebar">
        <div>
          {/* App Brand + Return to Main Website Link */}
          <div className="sidebar-top-brand">
            <Link to="/user" className="brand" style={{ fontSize: '.94rem' }} onClick={() => setSidebarOpen(false)}>
              <span className="logo" style={{ width: 24, height: 24, fontSize: '.78rem' }}>
                G
              </span>
              GynAura
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Link
                to="/"
                className="sidebar-ext-link"
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

          {/* Personalized User Identity Row */}
          <div className="sidebar-profile">
            <div className="sidebar-avatar" aria-hidden="true">
              {getInitials(userName)}
              <span className="sidebar-avatar-dot" />
            </div>
            <div className="sidebar-profile-meta">
              <div className="sidebar-profile-name">{userName}</div>
              <div className="sidebar-profile-sub">
                <span>{profile?.age || 28} yrs</span>
                <span>·</span>
                <span>{profile?.tag || 'General'} Care</span>
              </div>
            </div>
          </div>

          {SIDEBAR_GROUPS.map((grp) => (
            <div key={grp.group}>
              <div className="sidebar-group-lbl">
                <span>{grp.group}</span>
              </div>
              <nav className="sidebar-nav" aria-label={grp.group}>
                {grp.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`sidebar-link${activeSection === item.id ? ' on' : ''}`}
                    aria-current={activeSection === item.id ? 'page' : undefined}
                    onClick={() => selectSection(item.id)}
                  >
                    <span className="sidebar-link-main">
                      <Icon d={item.icon} size={15} />
                      <span>{item.label}</span>
                    </span>
                    {sectionCountMap[item.id] !== undefined && (
                      <span className="sidebar-count">{sectionCountMap[item.id]}</span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          ))}

          {/* Unified, Non-Nested Health Snapshot */}
          <div className="sidebar-summary" aria-label="Cycle and daily care summary">
            <div className="sidebar-summary-section">
              <div className="sidebar-widget-head">
                <span className="sidebar-widget-lbl">Cycle</span>
                <span className="sidebar-phase-tag">{hasCycle ? cycleMetrics.phase : 'Not Set'}</span>
              </div>
              <div className="sidebar-widget-meta">
                <strong style={{ color: 'var(--ink)' }}>
                  {hasCycle ? `Day ${cycleMetrics.day} of ${cycleMetrics.len}` : 'Not logged'}
                </strong>
                <span>{hasCycle ? `${cycleMetrics.pct}%` : '0%'}</span>
              </div>
              <div className="bar" style={{ margin: '1px 0 2px', height: 4 }}>
                <i style={{ width: `${hasCycle ? cycleMetrics.pct : 0}%` }} />
              </div>
              <div className="sidebar-date-pair">
                <div className="sidebar-date-item">
                  <small>Fertile</small>
                  <strong>
                    {hasCycle
                      ? `${formatShortDate(cycleMetrics.fertileStart)} – ${formatShortDate(cycleMetrics.fertileEnd)}`
                      : '—'}
                  </strong>
                </div>
                <div className="sidebar-date-item" style={{ textAlign: 'right' }}>
                  <small>Next Period</small>
                  <strong>{hasCycle ? formatShortDate(cycleMetrics.nextPeriod) : '—'}</strong>
                </div>
              </div>
            </div>

            <div className="sidebar-summary-divider" />

            <div className="sidebar-summary-section">
              <div className="sidebar-widget-head">
                <span className="sidebar-widget-lbl">Today&apos;s Pulse</span>
                <span className="sidebar-count">{doneReminders}/{reminders.length}</span>
              </div>
              <div className="sidebar-kv-list">
                <div className="sidebar-kv">
                  <span>Next Task</span>
                  <strong>{pendingReminder ? pendingReminder.name : 'None'}</strong>
                </div>
                <div className="sidebar-kv">
                  <span>Next Visit</span>
                  <strong>{nextAppointment ? nextAppointment.date : 'None'}</strong>
                </div>
                <div className="sidebar-kv">
                  <span>Latest Lab</span>
                  <strong>{latestReport ? latestReport.status : 'None'}</strong>
                </div>
                <div className="sidebar-kv">
                  <span>PCOS Habits</span>
                  <strong>{pcosHabits.length}/{PCOS_HABIT_NAMES.length} ({pcosPct}%)</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pinned Compact Footer Controls */}
        <div className="sidebar-footer-bar">
          <button
            type="button"
            className={`sidebar-footer-btn${activeSection === 'account' ? ' on' : ''}`}
            aria-current={activeSection === 'account' ? 'page' : undefined}
            onClick={handleOpenAccountView}
          >
            <Icon d={I.user} size={14} />
            <span>Account</span>
          </button>
          <button
            type="button"
            className="sidebar-footer-btn"
            onClick={handleLogout}
          >
            <Icon d={I.close} size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Web-App Workspace Pane */}
      <div className="webapp-main">
        {/* Top App Toolbar with Personalized Greeting */}
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
              <strong>{userName}</strong>
              <span>·</span>
              <span>{activeSectionTitle}</span>
            </div>
          </div>

          <div className="ws-actions">
            {statusBadge && (
              <span
                className={error ? 'badge-warn' : 'badge-ok'}
                role={error ? 'alert' : 'status'}
                aria-live="polite"
              >
                {statusBadge}
              </span>
            )}
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
              onClick={() => loadProfile(patientId)}
              disabled={loading}
            >
              {loading ? 'Syncing…' : 'Sync'}
            </button>
            <button
              type="button"
              className="ws-btn pri"
              onClick={() => {
                setActiveSection('visits');
                setVisitsTab('consults');
                setShowConsultDrawer(true);
              }}
            >
              + Book Consult
            </button>
            <button
              type="button"
              className="ws-btn"
              onClick={handleLogout}
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Scrollable Workspace Content */}
        <div className="webapp-content">
          {loading && !profile ? (
            <div className="table-wrap">
              <div className="table-empty">Loading {firstName}&apos;s clinical workspace…</div>
            </div>
          ) : (
            <>
              {/* ── 1. CARE PLAN & OVERVIEW ───────────────────────────────── */}
              {activeSection === 'overview' && (
                <>
                  <div className="view-head">
                    <div>
                      <h1 id="user-workspace-heading" tabIndex={-1}>{greeting}, {firstName}</h1>
                      <p>
                        Personal health workspace · {profile?.tag || 'General'} Care{profile?.summary ? ` · ${profile.summary}` : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="ws-btn"
                        onClick={() => {
                          setActiveSection('daily');
                          setDailyTab('symptoms');
                          setShowSymptomDrawer(true);
                        }}
                      >
                        + Log Today&apos;s Symptoms
                      </button>
                      <button
                        type="button"
                        className="ws-btn"
                        onClick={() => setActiveSection('cycle')}
                      >
                        Cycle Telemetry
                      </button>
                    </div>
                  </div>

                  {/* 4-Column Segmented KPI Strip */}
                  <div className="seg-kpis">
                    <div className="seg-kpi">
                      <span className="seg-kpi-lbl">Cycle Day &amp; Phase</span>
                      <strong className="seg-kpi-val">
                        {hasCycle ? `Day ${cycleMetrics.day} · ${cycleMetrics.phase}` : 'Not logged'}
                      </strong>
                    </div>
                    <div className="seg-kpi">
                      <span className="seg-kpi-lbl">Projected Next Period</span>
                      <strong className="seg-kpi-val">{hasCycle ? cycleMetrics.nextPeriod : '—'}</strong>
                    </div>
                    <div className="seg-kpi">
                      <span className="seg-kpi-lbl">Checklist Adherence</span>
                      <strong className="seg-kpi-val">
                        {reminders.length > 0 ? `${doneReminders} / ${reminders.length} (${remPct}%)` : '0 / 0'}
                      </strong>
                    </div>
                    <div className="seg-kpi">
                      <span className="seg-kpi-lbl">Latest Mood &amp; Flow</span>
                      <strong className="seg-kpi-val">
                        {moodLogs.length === 0 && symptomLogs.length === 0
                          ? 'Not logged'
                          : `${moodLogs[0]?.mood || '—'} · ${symptomLogs[0]?.flow || '—'}`}
                      </strong>
                    </div>
                  </div>

                  {/* Primary Care Plan Table + Daily Checklist Split */}
                  <div className="workspace-split">
                    <div className="table-wrap" tabIndex={0} role="region" aria-label="Active Clinical Care Plan">
                      <div className="table-bar">
                        <div className="table-bar-title">
                          <span>Active Clinical Care Plan</span>
                          <span className="badge-plum">{carePlans[0]?.assigned_by || 'Clinic Sync'}</span>
                        </div>
                        <span className="ws-sub">{carePlans.length} active directives</span>
                      </div>
                      <table className="data-table">
                        <caption>Active Clinical Care Plan</caption>
                        <thead>
                          <tr>
                            <th scope="col">Directive / Prescription</th>
                            <th scope="col">Category</th>
                            <th scope="col">Frequency</th>
                            <th scope="col">Doctor Instructions</th>
                            <th scope="col">Assigned</th>
                          </tr>
                        </thead>
                        <tbody>
                          {carePlans.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="table-empty">
                                No active care plan orders assigned yet.
                              </td>
                            </tr>
                          ) : (
                            carePlans.map((cp) => (
                              <tr key={cp.id}>
                                <td data-label="Directive">
                                  <strong>{cp.title}</strong>
                                </td>
                                <td data-label="Category">
                                  <span className="badge-plum">{cp.category || 'Care'}</span>
                                </td>
                                <td data-label="Frequency">{cp.frequency || 'Daily'}</td>
                                <td data-label="Instructions">{cp.notes || 'Follow standard schedule'}</td>
                                <td data-label="Assigned">{cp.created_at || 'Active'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Right Column: Today's Medication & Action Checklist Table */}
                    <div className="table-wrap" tabIndex={0} role="region" aria-label="Today's Reminders">
                      <div className="table-bar">
                        <div className="table-bar-title">
                          <span>Today&apos;s Reminders</span>
                          <span className="badge-plum">{remPct}%</span>
                        </div>
                        <button
                          type="button"
                          className="ws-btn"
                          onClick={() => {
                            setActiveSection('visits');
                            setVisitsTab('reminders');
                          }}
                        >
                          Manage All
                        </button>
                      </div>
                      <table className="data-table">
                        <caption>Today&apos;s Medication and Action Reminders</caption>
                        <thead>
                          <tr>
                            <th scope="col">Done</th>
                            <th scope="col">Task / Medication</th>
                            <th scope="col">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reminders.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="table-empty">
                                No daily reminders configured.
                              </td>
                            </tr>
                          ) : (
                            reminders.map((r) => (
                              <tr key={r.id}>
                                <td data-label="Done">
                                  <button
                                    type="button"
                                    className={`ws-btn${r.done ? ' pri' : ''}`}
                                    aria-pressed={Boolean(r.done)}
                                    aria-label={`${r.done ? 'Mark pending' : 'Mark completed'}: ${r.name}`}
                                    onClick={() => handleToggleReminder(r.id)}
                                  >
                                    {r.done ? '✓' : '○'}
                                  </button>
                                </td>
                                <td data-label="Task">
                                  <strong
                                    style={{
                                      textDecoration: r.done ? 'line-through' : 'none',
                                      opacity: r.done ? 0.65 : 1,
                                    }}
                                  >
                                    {r.name}
                                  </strong>
                                </td>
                                <td data-label="Time">{r.time || '09:00 AM'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* ── 2. CYCLE & FERTILITY ──────────────────────────────────── */}
              {activeSection === 'cycle' && (
                <>
                  <div className="view-head">
                    <div>
                      <h1 id="user-workspace-heading" tabIndex={-1}>Cycle &amp; Fertility Telemetry</h1>
                      <p>Ovulation window tracking, phase progression, and early-pregnancy sign evaluation</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div className="sub-tabs" role="tablist" aria-label="Cycle and fertility views">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={cycleTab === 'tracker'}
                          className={`sub-tab${cycleTab === 'tracker' ? ' on' : ''}`}
                          onClick={() => setCycleTab('tracker')}
                        >
                          Cycle &amp; Ovulation
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={cycleTab === 'pregnancy'}
                          className={`sub-tab${cycleTab === 'pregnancy' ? ' on' : ''}`}
                          onClick={() => setCycleTab('pregnancy')}
                        >
                          Early Pregnancy Check
                        </button>
                      </div>
                      {cycleTab === 'tracker' && (
                        <button
                          type="button"
                          className="ws-btn pri"
                          onClick={() => setShowCycleDrawer((v) => !v)}
                        >
                          {showCycleDrawer ? 'Close Settings' : 'Update Period Dates'}
                        </button>
                      )}
                    </div>
                  </div>

                  {cycleTab === 'tracker' ? (
                    <>
                      {/* 4-Phase Horizontal Clinical Stepper */}
                      <div className="cycle-phase-track">
                        {[
                          { name: 'Menstrual', span: 'Days 1 – 5', desc: 'Uterine shedding · Rest & iron intake' },
                          { name: 'Follicular', span: `Days 6 – ${Math.max(9, cycleMetrics.len - 15)}`, desc: 'Rising estrogen · Follicle maturation' },
                          { name: 'Ovulation', span: `${cycleMetrics.fertileStart} – ${cycleMetrics.fertileEnd}`, desc: 'Peak fertility window · LH surge' },
                          { name: 'Luteal', span: `Days ${Math.max(12, cycleMetrics.len - 12)} – ${cycleMetrics.len}`, desc: 'Progesterone dominant · Pre-period' },
                        ].map((ph) => (
                          <div
                            key={ph.name}
                            className={`cycle-phase-step${cycleMetrics.phase === ph.name ? ' active' : ''}`}
                          >
                            <small>{ph.span}</small>
                            <strong>{ph.name} Phase</strong>
                            <span>{ph.desc}</span>
                          </div>
                        ))}
                      </div>

                      {showCycleDrawer && (
                        <form className="app-drawer" onSubmit={handleSaveCycle}>
                          <div className="sec-lbl">
                            <span>Update Menstrual Baseline</span>
                            <button
                              type="button"
                              className="ws-btn"
                              onClick={() => setShowCycleDrawer(false)}
                            >
                              Close
                            </button>
                          </div>
                          <div className="split-2">
                            <div className="field-group">
                              <label htmlFor="cycle-last-period">Last Period Start Date (LMP)</label>
                              <input
                                id="cycle-last-period"
                                type="date"
                                value={lastPeriod}
                                onChange={(e) => setLastPeriod(e.target.value)}
                              />
                            </div>
                            <div className="field-group">
                              <label htmlFor="cycle-length">Typical Cycle Length (days)</label>
                              <input
                                id="cycle-length"
                                type="number"
                                min="18"
                                max="60"
                                value={cycleLength}
                                onChange={(e) => setCycleLength(e.target.value)}
                              />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="submit" className="ws-btn pri">
                              Save Baseline
                            </button>
                            <button
                              type="button"
                              className="ws-btn"
                              onClick={() => setShowCycleDrawer(false)}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}

                      <div className="table-wrap" tabIndex={0} role="region" aria-label="Menstrual and Ovulation Parameters">
                        <div className="table-bar">
                          <div className="table-bar-title">
                            <span>Menstrual &amp; Ovulation Parameters</span>
                            {hasCycle && <span className="badge-plum">{cycleMetrics.pct}% cycle elapsed</span>}
                          </div>
                          <span className="ws-sub">{hasCycle ? `LMP: ${lastPeriod}` : 'No baseline set'}</span>
                        </div>
                        <table className="data-table">
                          <caption>Menstrual cycle and ovulation parameters</caption>
                          <thead>
                            <tr>
                              <th scope="col">Clinical Parameter</th>
                              <th scope="col">Calculated Reading</th>
                              <th scope="col">Calendar Window / Reference</th>
                              <th scope="col">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {!hasCycle ? (
                              <tr>
                                <td colSpan={4} className="table-empty">
                                  No cycle dates logged yet. Click &ldquo;Update Period Dates&rdquo; above to enter your last period start date.
                                </td>
                              </tr>
                            ) : (
                              <>
                                <tr>
                                  <td data-label="Parameter"><strong>Current Cycle Day</strong></td>
                                  <td data-label="Reading">
                                    <strong>Day {cycleMetrics.day} of {cycleMetrics.len}</strong>
                                  </td>
                                  <td data-label="Window">Started {lastPeriod}</td>
                                  <td data-label="Status"><span className="badge-plum">Active</span></td>
                                </tr>
                                <tr>
                                  <td data-label="Parameter"><strong>Active Biological Phase</strong></td>
                                  <td data-label="Reading"><strong>{cycleMetrics.phase}</strong></td>
                                  <td data-label="Window">Standard 4-phase endocrine model</td>
                                  <td data-label="Status"><span className="badge-ok">{cycleMetrics.phase}</span></td>
                                </tr>
                                <tr>
                                  <td data-label="Parameter"><strong>Estimated Fertile Window</strong></td>
                                  <td data-label="Reading"><strong>{cycleMetrics.fertileStart} → {cycleMetrics.fertileEnd}</strong></td>
                                  <td data-label="Window">Cycle Days {Math.max(1, cycleMetrics.len - 18)} – {Math.max(2, cycleMetrics.len - 12)}</td>
                                  <td data-label="Status"><span className="badge-plum">Ovulatory Window</span></td>
                                </tr>
                                <tr>
                                  <td data-label="Parameter"><strong>Projected Next Period</strong></td>
                                  <td data-label="Reading"><strong>{cycleMetrics.nextPeriod}</strong></td>
                                  <td data-label="Window">+{cycleMetrics.len} days from last period start</td>
                                  <td data-label="Status"><span className="badge-warn">Upcoming</span></td>
                                </tr>
                              </>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="table-wrap" tabIndex={0} role="region" aria-label="Early Pregnancy Symptom Screening">
                        <div className="table-bar">
                          <div className="table-bar-title">
                            <span>Early Pregnancy Symptom Screening</span>
                            <span className="badge-plum">{signs.length} / {PREG_SIGNS.length} selected</span>
                          </div>
                          <button type="button" className="ws-btn pri" onClick={handlePregCheck}>
                            Run Educational Assessment
                          </button>
                        </div>
                        <table className="data-table">
                          <caption>Early pregnancy symptom screening checklist</caption>
                          <thead>
                            <tr>
                              <th scope="col">Early Clinical Sign</th>
                              <th scope="col">Observation Status</th>
                              <th scope="col" className="num">Toggle</th>
                            </tr>
                          </thead>
                          <tbody>
                            {PREG_SIGNS.map((s) => {
                              const selected = signs.includes(s);
                              return (
                                <tr key={s} className={selected ? 'row-selected' : ''}>
                                  <td data-label="Sign"><strong>{s}</strong></td>
                                  <td data-label="Status">
                                    {selected ? (
                                      <span className="badge-plum">Observed</span>
                                    ) : (
                                      <span className="ws-sub">Not observed</span>
                                    )}
                                  </td>
                                  <td data-label="Action" className="num">
                                    <button
                                      type="button"
                                      className={`ws-btn${selected ? ' pri' : ''}`}
                                      aria-pressed={selected}
                                      onClick={() => toggleArrayItem(signs, setSigns, s)}
                                    >
                                      {selected ? 'Selected ✓' : 'Select'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {pregResult && (
                        <div className="app-drawer" style={{ marginTop: 14 }} role="status" aria-live="polite">
                          <div className="sec-lbl">
                            <span>Educational Next-Step Guidance ({pregResult.signs_count ?? signs.length} signs)</span>
                            <span className="badge-warn">Non-Diagnostic</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '.84rem', color: 'var(--ink)' }}>
                            {pregResult.recommendation}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* ── 3. DAILY LOGS & HABITS ────────────────────────────────── */}
              {activeSection === 'daily' && (
                <>
                  <div className="view-head">
                    <div>
                      <h1 id="user-workspace-heading" tabIndex={-1}>Daily Telemetry &amp; Metabolic Habits</h1>
                      <p>Log menstrual flow, pelvic pain, hormone mood changes, and PCOS daily habits</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div className="sub-tabs" role="tablist" aria-label="Daily logs views">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={dailyTab === 'symptoms'}
                          className={`sub-tab${dailyTab === 'symptoms' ? ' on' : ''}`}
                          onClick={() => setDailyTab('symptoms')}
                        >
                          Flow &amp; Pain ({symptomLogs.length})
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={dailyTab === 'mood'}
                          className={`sub-tab${dailyTab === 'mood' ? ' on' : ''}`}
                          onClick={() => setDailyTab('mood')}
                        >
                          Mood Log ({moodLogs.length})
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={dailyTab === 'pcos'}
                          className={`sub-tab${dailyTab === 'pcos' ? ' on' : ''}`}
                          onClick={() => setDailyTab('pcos')}
                        >
                          PCOS Habits ({pcosPct}%)
                        </button>
                      </div>
                      {dailyTab === 'symptoms' && (
                        <button
                          type="button"
                          className="ws-btn pri"
                          onClick={() => setShowSymptomDrawer((v) => !v)}
                        >
                          {showSymptomDrawer ? 'Close Form' : '+ Log Flow & Pain'}
                        </button>
                      )}
                    </div>
                  </div>

                  {dailyTab === 'symptoms' && (
                    <>
                      {showSymptomDrawer && (
                        <form className="app-drawer" onSubmit={handleLogSymptoms}>
                          <div className="sec-lbl">
                            <span>Record Menstrual Flow &amp; Pelvic Pain</span>
                            <button
                              type="button"
                              className="ws-btn"
                              onClick={() => setShowSymptomDrawer(false)}
                            >
                              Close
                            </button>
                          </div>
                          <div className="split-2">
                            <div className="field-group">
                              <label>Bleeding / Flow Intensity</label>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                {FLOWS.map((f) => (
                                  <button
                                    key={f}
                                    type="button"
                                    aria-pressed={flow === f}
                                    className={`mini-pill${flow === f ? ' on' : ''}`}
                                    onClick={() => setFlow(f)}
                                  >
                                    {f}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="field-group">
                              <label htmlFor="pain-range-input" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Pelvic Pain Score: {pain} / 10</span>
                                <span style={{ color: painMeta.color }}>{painMeta.label}</span>
                              </label>
                              <input
                                id="pain-range-input"
                                type="range"
                                min="0"
                                max="10"
                                value={pain}
                                onChange={(e) => setPain(Number(e.target.value))}
                                style={{ accentColor: painMeta.color }}
                              />
                            </div>
                          </div>
                          <div className="field-group">
                            <label>Associated Physical Symptoms</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                              {SYMPTOM_OPTIONS.map((sym) => (
                                <button
                                  key={sym}
                                  type="button"
                                  aria-pressed={symptoms.includes(sym)}
                                  className={`mini-pill${symptoms.includes(sym) ? ' on' : ''}`}
                                  onClick={() => toggleArrayItem(symptoms, setSymptoms, sym)}
                                >
                                  {sym}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="submit" className="ws-btn pri">
                              Save Entry
                            </button>
                            <button
                              type="button"
                              className="ws-btn"
                              onClick={() => setShowSymptomDrawer(false)}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}

                      <div className="table-wrap" tabIndex={0} role="region" aria-label="Flow, Pain and Physical Symptom Log">
                        <div className="table-bar">
                          <div className="table-bar-title">
                            <span>Flow, Pain &amp; Physical Symptom Log</span>
                          </div>
                          <span className="ws-sub">{symptomLogs.length} entries synced with clinic</span>
                        </div>
                        <table className="data-table">
                          <caption>Flow, Pain and Physical Symptom History</caption>
                          <thead>
                            <tr>
                              <th scope="col">Timestamp</th>
                              <th scope="col">Menstrual Flow</th>
                              <th scope="col">Pelvic Pain</th>
                              <th scope="col">Physical Symptoms</th>
                            </tr>
                          </thead>
                          <tbody>
                            {symptomLogs.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="table-empty">
                                  No flow or symptom entries logged yet.
                                </td>
                              </tr>
                            ) : (
                              symptomLogs.map((sl) => {
                                const score = Number(sl.pain ?? 0);
                                const meta = getPainMeta(score);
                                return (
                                  <tr key={sl.id}>
                                    <td data-label="Timestamp">{sl.timestamp || '—'}</td>
                                    <td data-label="Flow"><strong>{sl.flow || 'None'}</strong></td>
                                    <td data-label="Pain Score">
                                      <span style={{ marginRight: 8 }}>{score} / 10</span>
                                      <span className={meta.badge}>{meta.label}</span>
                                    </td>
                                    <td data-label="Symptoms">
                                      {sl.symptoms?.length > 0 ? sl.symptoms.join(', ') : 'None reported'}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {dailyTab === 'mood' && (
                    <div className="table-wrap" tabIndex={0} role="region" aria-label="Mood and Hormone History">
                      <form className="table-bar" onSubmit={handleLogMood}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                          {MOODS.map((m) => (
                            <button
                              key={m}
                              type="button"
                              aria-pressed={selectedMood === m}
                              className={`mini-pill${selectedMood === m ? ' on' : ''}`}
                              onClick={() => setSelectedMood(m)}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: '1 1 260px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <label htmlFor="mood-note-input" className="visually-hidden">Mood Note</label>
                          <input
                            id="mood-note-input"
                            type="text"
                            value={moodNote}
                            onChange={(e) => setMoodNote(e.target.value)}
                            placeholder="Add note (sleep, energy, triggers)..."
                            style={{ margin: 0, maxWidth: 300, padding: '6px 10px', fontSize: '.8rem' }}
                          />
                          <button type="submit" className="ws-btn pri">
                            + Log Mood
                          </button>
                        </div>
                      </form>
                      <table className="data-table">
                        <caption>Mood and Hormone Log History</caption>
                        <thead>
                          <tr>
                            <th scope="col">Timestamp</th>
                            <th scope="col">Mood State</th>
                            <th scope="col">Cycle Phase Context</th>
                            <th scope="col">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {moodLogs.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="table-empty">
                                No mood entries recorded yet.
                              </td>
                            </tr>
                          ) : (
                            moodLogs.map((ml) => (
                              <tr key={ml.id}>
                                <td data-label="Timestamp">{ml.timestamp || '—'}</td>
                                <td data-label="Mood"><span className="badge-plum">{ml.mood}</span></td>
                                <td data-label="Cycle Phase">{getCycleContextForTimestamp(lastPeriod, cycleLength, ml.timestamp)}</td>
                                <td data-label="Notes">{ml.note || '—'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {dailyTab === 'pcos' && (
                    <div className="table-wrap" tabIndex={0} role="region" aria-label="PCOS Daily Metabolic Protocol">
                      <div className="table-bar">
                        <div className="table-bar-title">
                          <span>PCOS &amp; PCOD Daily Metabolic Protocol</span>
                          <span className="badge-ok">{pcosHabits.length} / {PCOS_HABIT_NAMES.length} completed</span>
                        </div>
                        <span className="ws-sub">Daily adherence: {pcosPct}%</span>
                      </div>
                      <table className="data-table">
                        <caption>PCOS and PCOD Daily Metabolic Habits</caption>
                        <thead>
                          <tr>
                            <th scope="col">Daily Habit</th>
                            <th scope="col">Endocrine / Metabolic Target</th>
                            <th scope="col">Today&apos;s Status</th>
                            <th scope="col" className="num">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {PCOS_HABITS.map((habit) => {
                            const completed = pcosHabits.includes(habit.name);
                            return (
                              <tr key={habit.name} className={completed ? 'row-selected' : ''}>
                                <td data-label="Habit"><strong>{habit.name}</strong></td>
                                <td data-label="Target">{habit.target}</td>
                                <td data-label="Status">
                                  <span className={completed ? 'badge-ok' : 'badge-warn'}>
                                    {completed ? 'Completed' : 'Pending'}
                                  </span>
                                </td>
                                <td data-label="Action" className="num">
                                  <button
                                    type="button"
                                    className={`ws-btn${completed ? '' : ' pri'}`}
                                    aria-pressed={completed}
                                    onClick={() => handleTogglePcosHabit(habit.name)}
                                  >
                                    {completed ? 'Completed ✓' : 'Mark Done'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* ── 4. LAB VAULT & GLOSSARY ───────────────────────────────── */}
              {activeSection === 'records' && (
                <>
                  <div className="view-head">
                    <div>
                      <h1 id="user-workspace-heading" tabIndex={-1}>Diagnostic Lab Vault &amp; Biomarker Reference</h1>
                      <p>Ultrasound scans, hormone panels, and plain-language explanations from your gynecologist</p>
                    </div>
                    <div className="sub-tabs" role="tablist" aria-label="Lab records and glossary">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={recordsTab === 'reports'}
                        className={`sub-tab${recordsTab === 'reports' ? ' on' : ''}`}
                        onClick={() => setRecordsTab('reports')}
                      >
                        My Reports ({reports.length})
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={recordsTab === 'glossary'}
                        className={`sub-tab${recordsTab === 'glossary' ? ' on' : ''}`}
                        onClick={() => setRecordsTab('glossary')}
                      >
                        Lab &amp; Rx Glossary ({Object.keys(LAB_GLOSSARY).length})
                      </button>
                    </div>
                  </div>

                  {recordsTab === 'reports' ? (
                    <div className="table-wrap" tabIndex={0} role="region" aria-label="Published Diagnostic Reports">
                      <div className="table-bar">
                        <div className="table-bar-title">
                          <span>Published Diagnostic Reports</span>
                          <span className="badge-ok">Clinic Verified</span>
                        </div>
                        <span className="ws-sub">{reports.length} records on file</span>
                      </div>
                      <table className="data-table">
                        <caption>Published Diagnostic Reports</caption>
                        <thead>
                          <tr>
                            <th scope="col">Report / Panel Title</th>
                            <th scope="col">Date</th>
                            <th scope="col">Status</th>
                            <th scope="col">Clinical Findings</th>
                            <th scope="col">Doctor&apos;s Plain-Language Explanation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reports.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="table-empty">
                                No lab or ultrasound reports published to your chart yet.
                              </td>
                            </tr>
                          ) : (
                            reports.map((rep) => (
                              <tr key={rep.id}>
                                <td data-label="Report"><strong>{rep.title}</strong></td>
                                <td data-label="Date">{rep.date || '—'}</td>
                                <td data-label="Status">
                                  <span className={rep.status === 'Normal' ? 'badge-ok' : 'badge-warn'}>
                                    {rep.status || 'Reviewed'}
                                  </span>
                                </td>
                                <td data-label="Findings">{rep.summary || '—'}</td>
                                <td data-label="Explanation">{rep.plain_explanation || rep.plain_language || '—'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="table-wrap" tabIndex={0} role="region" aria-label="OB-GYN Biomarker Glossary">
                      <div className="table-bar">
                        <div className="table-bar-title">
                          <span>OB-GYN Biomarker &amp; Scan Reference Glossary</span>
                        </div>
                        <span className="ws-sub">Plain-language interpretation guide</span>
                      </div>
                      <table className="data-table">
                        <caption>OB-GYN Biomarker and Scan Reference Glossary</caption>
                        <thead>
                          <tr>
                            <th scope="col">Code</th>
                            <th scope="col">Biomarker / Modality</th>
                            <th scope="col">Typical Reference Range</th>
                            <th scope="col">What It Means for Your Care</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(LAB_GLOSSARY).map(([key, item]) => (
                            <tr key={key}>
                              <td data-label="Code"><span className="badge-plum">{key}</span></td>
                              <td data-label="Biomarker"><strong>{item.name}</strong></td>
                              <td data-label="Reference Range">{item.range}</td>
                              <td data-label="Clinical Meaning">{item.note}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* ── 5. CONSULTS & REMINDERS ───────────────────────────────── */}
              {activeSection === 'visits' && (
                <>
                  <div className="view-head">
                    <div>
                      <h1 id="user-workspace-heading" tabIndex={-1}>Consultations &amp; Medication Reminders</h1>
                      <p>Manage tele-consultations, clinic bookings, and daily medication schedules</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div className="sub-tabs" role="tablist" aria-label="Consultations and reminders">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={visitsTab === 'consults'}
                          className={`sub-tab${visitsTab === 'consults' ? ' on' : ''}`}
                          onClick={() => setVisitsTab('consults')}
                        >
                          Appointments ({appointments.length})
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={visitsTab === 'reminders'}
                          className={`sub-tab${visitsTab === 'reminders' ? ' on' : ''}`}
                          onClick={() => setVisitsTab('reminders')}
                        >
                          Reminders ({doneReminders}/{reminders.length})
                        </button>
                      </div>
                      {visitsTab === 'consults' && (
                        <button
                          type="button"
                          className="ws-btn pri"
                          onClick={() => setShowConsultDrawer((v) => !v)}
                        >
                          {showConsultDrawer ? 'Close Form' : '+ Request Slot'}
                        </button>
                      )}
                    </div>
                  </div>

                  {visitsTab === 'consults' ? (
                    <>
                      {showConsultDrawer && (
                        <form className="app-drawer" onSubmit={handleBookConsult}>
                          <div className="sec-lbl">
                            <span>Book Tele-Consultation or Clinic Slot</span>
                            <button
                              type="button"
                              className="ws-btn"
                              onClick={() => setShowConsultDrawer(false)}
                            >
                              Close
                            </button>
                          </div>
                          <div className="field-group">
                            <label>Select Consultation Window</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                              {CONSULT_SLOTS.map((slot) => (
                                <button
                                  key={slot}
                                  type="button"
                                  aria-pressed={consultSlot === slot}
                                  className={`mini-pill${consultSlot === slot ? ' on' : ''}`}
                                  onClick={() => setConsultSlot(slot)}
                                >
                                  {slot}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="split-2">
                            <div className="field-group">
                              <label htmlFor="consult-date">Preferred Date</label>
                              <input
                                id="consult-date"
                                type="date"
                                value={consultDate}
                                onChange={(e) => setConsultDate(e.target.value)}
                              />
                            </div>
                            <div className="field-group">
                              <label htmlFor="consult-notes">Clinical Notes / Questions</label>
                              <input
                                id="consult-notes"
                                type="text"
                                value={consultNotes}
                                onChange={(e) => setConsultNotes(e.target.value)}
                                placeholder="Topic or symptom to discuss..."
                              />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="submit" className="ws-btn pri">
                              Confirm Booking Request
                            </button>
                            <button
                              type="button"
                              className="ws-btn"
                              onClick={() => setShowConsultDrawer(false)}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}

                      <div className="table-wrap" tabIndex={0} role="region" aria-label="Scheduled Consultations">
                        <div className="table-bar">
                          <div className="table-bar-title">
                            <span>Scheduled Consultations &amp; Clinic Visits</span>
                          </div>
                          <span className="ws-sub">{appointments.length} total bookings</span>
                        </div>
                        <table className="data-table">
                          <caption>Scheduled Consultations and Clinic Visits</caption>
                          <thead>
                            <tr>
                              <th scope="col">Consultation Slot / Service</th>
                              <th scope="col">Preferred Date</th>
                              <th scope="col">Modality</th>
                              <th scope="col">Notes</th>
                              <th scope="col">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {appointments.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="table-empty">
                                  No consultations booked yet. Click &ldquo;+ Request Slot&rdquo; to schedule.
                                </td>
                              </tr>
                            ) : (
                              appointments.map((apt) => (
                                <tr key={apt.id}>
                                  <td data-label="Service"><strong>{apt.service}</strong></td>
                                  <td data-label="Date">{apt.date || '—'}</td>
                                  <td data-label="Mode"><span className="badge-plum">{apt.mode || 'Video'}</span></td>
                                  <td data-label="Notes">{apt.notes || '—'}</td>
                                  <td data-label="Status">
                                    <span className={apt.status === 'Confirmed' ? 'badge-ok' : 'badge-warn'}>
                                      {apt.status || 'Pending'}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="table-wrap" tabIndex={0} role="region" aria-label="Medication and Care Reminders">
                      <div className="table-bar">
                        <div className="table-bar-title">
                          <span>Medication &amp; Care Reminders</span>
                          <span className="badge-ok">{remPct}% Done</span>
                        </div>
                        <form
                          onSubmit={handleAddReminder}
                          style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}
                        >
                          <label htmlFor="rem-name-input" className="visually-hidden">Reminder Name</label>
                          <input
                            id="rem-name-input"
                            type="text"
                            value={remName}
                            onChange={(e) => setRemName(e.target.value)}
                            placeholder="New medication or reminder..."
                            style={{ margin: 0, width: 220, padding: '6px 10px', fontSize: '.8rem' }}
                          />
                          <label htmlFor="rem-time-input" className="visually-hidden">Reminder Time</label>
                          <input
                            id="rem-time-input"
                            type="text"
                            value={remTime}
                            onChange={(e) => setRemTime(e.target.value)}
                            placeholder="09:00 AM"
                            style={{ margin: 0, width: 105, padding: '6px 10px', fontSize: '.8rem' }}
                          />
                          <button type="submit" className="ws-btn pri">
                            + Add
                          </button>
                        </form>
                      </div>
                      <table className="data-table">
                        <caption>Medication and Care Reminders</caption>
                        <thead>
                          <tr>
                            <th scope="col">Complete</th>
                            <th scope="col">Reminder / Medication</th>
                            <th scope="col">Scheduled Time</th>
                            <th scope="col">Status</th>
                            <th scope="col" className="num">Remove</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reminders.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="table-empty">
                                No reminders scheduled yet.
                              </td>
                            </tr>
                          ) : (
                            reminders.map((r) => (
                              <tr key={r.id}>
                                <td data-label="Complete">
                                  <button
                                    type="button"
                                    className={`ws-btn${r.done ? ' pri' : ''}`}
                                    aria-pressed={Boolean(r.done)}
                                    aria-label={`${r.done ? 'Mark pending' : 'Mark completed'}: ${r.name}`}
                                    onClick={() => handleToggleReminder(r.id)}
                                  >
                                    {r.done ? '✓' : '○'}
                                  </button>
                                </td>
                                <td data-label="Reminder">
                                  <strong style={{ textDecoration: r.done ? 'line-through' : 'none' }}>
                                    {r.name}
                                  </strong>
                                </td>
                                <td data-label="Time">{r.time || '—'}</td>
                                <td data-label="Status">
                                  <span className={r.done ? 'badge-ok' : 'badge-warn'}>
                                    {r.done ? 'Completed' : 'Pending'}
                                  </span>
                                </td>
                                <td data-label="Remove" className="num">
                                  <button
                                    type="button"
                                    className="ws-btn"
                                    aria-label={`Remove reminder ${r.name}`}
                                    onClick={(e) => handleDeleteReminder(e, r.id)}
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
                  )}
                </>
              )}

              {/* ── 6. CLINICAL EDUCATION ─────────────────────────────────── */}
              {activeSection === 'guides' && (
                <>
                  <div className="view-head">
                    <div>
                      <h1 id="user-workspace-heading" tabIndex={-1}>Intimate Hygiene &amp; Preventive Clinical Guides</h1>
                      <p>Evidence-based gynecological care standards and red-flag triage thresholds</p>
                    </div>
                    <span className="badge-ok">OB-GYN Reviewed</span>
                  </div>

                  <div className="table-wrap" tabIndex={0} role="region" aria-label="Clinical Hygiene Protocols">
                    <div className="table-bar">
                      <div className="table-bar-title">
                        <span>Clinical Hygiene &amp; Preventive Care Protocols</span>
                      </div>
                      <span className="ws-sub">{HYGIENE_CARDS.length} clinical domains</span>
                    </div>
                    <table className="data-table">
                      <caption>Clinical Hygiene and Preventive Care Protocols</caption>
                      <thead>
                        <tr>
                          <th scope="col">Clinical Domain</th>
                          <th scope="col">Target Standard</th>
                          <th scope="col">Evidence-Based Practice</th>
                          <th scope="col">Action Threshold</th>
                        </tr>
                      </thead>
                      <tbody>
                        {HYGIENE_CARDS.map((card) => (
                          <tr key={card.title}>
                            <td data-label="Domain" style={{ whiteSpace: 'nowrap' }}>
                              <strong>{card.title}</strong>
                            </td>
                            <td data-label="Standard" style={{ whiteSpace: 'nowrap' }}>
                              <span className="badge-plum">{card.standard}</span>
                            </td>
                            <td data-label="Practice">{card.body}</td>
                            <td data-label="Threshold" style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                              {card.target}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* ── 7. ACCOUNT SETTINGS ───────────────────────────────────── */}
              {activeSection === 'account' && (
                <>
                  <div className="view-head">
                    <div>
                      <h1 id="user-workspace-heading" tabIndex={-1}>Account Settings · {userName}</h1>
                      <p>Update your personal details and primary clinical care focus</p>
                    </div>
                  </div>

                  <div className="workspace-split">
                    <div className="table-wrap" tabIndex={0} role="region" aria-label="Patient Identity Record">
                      <div className="table-bar">
                        <div className="table-bar-title">
                          <span>Patient Identity Record</span>
                        </div>
                        <span className="badge-ok">Active Account</span>
                      </div>
                      <table className="data-table">
                        <caption>Patient Identity Record</caption>
                        <thead>
                          <tr>
                            <th scope="col">Field</th>
                            <th scope="col">Current Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td data-label="Field"><strong>Full Name</strong></td>
                            <td data-label="Value">{profile?.name || '—'}</td>
                          </tr>
                          <tr>
                            <td data-label="Field"><strong>Registered Mobile</strong></td>
                            <td data-label="Value">{profile?.phone || '—'}</td>
                          </tr>
                          <tr>
                            <td data-label="Field"><strong>Age</strong></td>
                            <td data-label="Value">{profile?.age ? `${profile.age} yrs` : '—'}</td>
                          </tr>
                          <tr>
                            <td data-label="Field"><strong>Care Focus</strong></td>
                            <td data-label="Value"><span className="badge-plum">{profile?.tag || 'General'}</span></td>
                          </tr>
                          <tr>
                            <td data-label="Field"><strong>Clinical Summary</strong></td>
                            <td data-label="Value">{profile?.summary || 'Women’s Health & Cycle Care'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <form className="app-drawer" style={{ margin: 0 }} onSubmit={handleSaveAccount}>
                      <div className="sec-lbl">
                        <span>Edit Profile Details</span>
                      </div>
                      {acctErr && (
                        <div className="badge-warn" role="alert" style={{ marginBottom: 12, width: '100%', height: 'auto', padding: '6px 10px' }}>
                          {acctErr}
                        </div>
                      )}
                      <div className="field-group">
                        <label htmlFor="patient-acct-name">Full Name</label>
                        <input
                          id="patient-acct-name"
                          type="text"
                          autoComplete="name"
                          value={acctName}
                          onChange={(e) => setAcctName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="field-group">
                        <label htmlFor="patient-acct-phone">Mobile Number</label>
                        <input
                          id="patient-acct-phone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          maxLength={14}
                          value={acctPhone}
                          onChange={(e) => setAcctPhone(e.target.value)}
                          required
                        />
                      </div>
                      <div className="split-2">
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
                      </div>
                      <button type="submit" className="ws-btn pri" disabled={acctSaving}>
                        {acctSaving ? 'Saving…' : 'Save Profile Changes'}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </>
          )}

          {/* Mandatory Clinical Disclaimer */}
          <div className="disc-bar">
            Educational support only — GynAura&apos;s AI health guidance and pregnancy features do not replace medical diagnosis, clinical consultation, or pregnancy testing.
          </div>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="mobile-bottom-nav" aria-label="Mobile quick navigation">
          {mobileQuickItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`mobile-nav-btn${activeSection === item.id ? ' on' : ''}`}
              aria-current={activeSection === item.id ? 'page' : undefined}
              onClick={() => selectSection(item.id)}
            >
              <Icon d={item.icon} size={16} />
              <span>{item.shortLabel}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
