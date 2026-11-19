import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, setSession } from '../api.js';

const DEMO_USERS = [
  { label: 'Priya Sharma', phone: '9876543210', role: 'patient' },
  { label: 'Neha Verma', phone: '9826011122', role: 'patient' },
  { label: 'Dr. Sarah Jenkins', phone: '9999900000', role: 'doctor' },
];

const CARE_FOCUSES = ['Antenatal', 'PCOS', 'Fertility', 'General'];

export default function LoginPage() {
  const navigate = useNavigate();

  const [role, setRole] = useState('patient');
  const [mode, setMode] = useState('signin'); // 'signin' | 'register'
  const [step, setStep] = useState(1); // 1: phone, 2: otp

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Google OAuth State
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleBtnRef = useRef(null);
  const roleRef = useRef(role);

  // New Patient registration fields
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [tag, setTag] = useState('Antenatal');

  // Admin Login State
  const [adminKey, setAdminKey] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    let mounted = true;
    apiGet('/auth/config')
      .then((cfg) => {
        if (!mounted) return;
        if (cfg?.google_client_id) {
          setGoogleClientId(cfg.google_client_id);
        }
        setGoogleEnabled(Boolean(cfg?.google_enabled));
      })
      .catch(() => {
        // Fallback gracefully if auth/config is initializing
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleGoogleCredential = async (response) => {
    if (!response?.credential) return;
    setGoogleLoading(true);
    setError('');
    try {
      const res = await apiPost('/auth/google', {
        id_token: response.credential,
        role: roleRef.current,
      });
      setSession({ token: res.token, role: res.role, user: res.user });
      navigate(res.role === 'admin' ? '/admin' : res.role === 'doctor' ? '/doctor' : '/user');
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again or use OTP.');
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (!googleClientId || !googleEnabled) return;

    const renderBtn = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        googleBtnRef.current.innerHTML = '';
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredential,
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          width: 340,
          text: 'continue_with',
        });
      }
    };

    if (window.google?.accounts?.id) {
      renderBtn();
    } else {
      const existingScript = document.getElementById('google-gsi-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'google-gsi-script';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          renderBtn();
        };
        document.body.appendChild(script);
      } else {
        existingScript.addEventListener('load', renderBtn);
      }
    }
  }, [googleClientId, googleEnabled, role]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRoleChange = (nextRole) => {
    setRole(nextRole);
    if (nextRole === 'doctor' || nextRole === 'admin') {
      setMode('signin');
    }
    setStep(1);
    setOtp('');
    setDemoOtp('');
    setAdminKey('');
    setSmsSent(false);
    setCooldown(0);
    setError('');
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    setStep(1);
    setOtp('');
    setDemoOtp('');
    setSmsSent(false);
    setCooldown(0);
    setError('');
  };

  const applyDemo = (demo) => {
    setRole(demo.role);
    setMode('signin');
    setStep(1);
    setPhone(demo.phone);
    setOtp('');
    setDemoOtp('');
    setSmsSent(false);
    setCooldown(0);
    setError('');
  };

  const handleRequestOtp = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const raw = phone.trim();
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 10 && !(digits.length === 12 && digits.startsWith('91'))) {
      setError('Please enter a valid mobile number (e.g. 9876543210 or +919876543210).');
      return;
    }
    const targetPhone = raw.startsWith('+') ? ('+' + digits) : digits;

    setLoading(true);
    setError('');
    try {
      const res = await apiPost('/auth/request-otp', { phone: targetPhone, role });
      setPhone(targetPhone);
      if (res?.sms_sent) {
        setSmsSent(true);
        setDemoOtp('');
        setOtp('');
      } else if (res?.demo_otp) {
        setSmsSent(false);
        setDemoOtp(String(res.demo_otp));
        setOtp(String(res.demo_otp));
      }
      setStep(2);
      setCooldown(30);
    } catch (err) {
      setError(err.message || 'Unable to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (otp.trim().length < 4) {
      setError('Please enter the 6-digit OTP.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const raw = phone.trim();
      const digits = raw.replace(/\D/g, '');
      const targetPhone = raw.startsWith('+') ? ('+' + digits) : digits;
      const res = await apiPost('/auth/verify-otp', {
        phone: targetPhone,
        otp: otp.trim(),
        role,
      });
      setSession({ token: res.token, role: res.role, user: res.user });
      navigate(res.role === 'admin' ? '/admin' : res.role === 'doctor' ? '/doctor' : '/user');
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    const raw = phone.trim();
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 10 && !(digits.length === 12 && digits.startsWith('91'))) {
      setError('Please enter a valid mobile number (e.g. 9876543210 or +919876543210).');
      return;
    }
    const targetPhone = raw.startsWith('+') ? ('+' + digits) : digits;
    const parsedAge = Number(age);
    if (!parsedAge || parsedAge < 12 || parsedAge > 100) {
      setError('Please enter a valid age.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await apiPost('/auth/register', {
        name: name.trim(),
        phone: targetPhone,
        age: parsedAge,
        tag,
      });
      setSession({ token: res.token, role: res.role || 'patient', user: res.user });
      navigate('/user');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!adminKey.trim()) {
      setError('Please enter the Admin Access Key.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiPost('/auth/admin-login', { admin_key: adminKey.trim() });
      setSession({ token: res.token, role: res.role || 'admin', user: res.user });
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Invalid admin access key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="login-shell">
      <div className="login-card surface">
        <div className="login-head">
          <div className="brand">
            <span className="logo">G</span>GynAura
          </div>
          <h1>{role === 'admin' ? 'GynAura Admin Portal' : 'Sign in to GynAura'}</h1>
          <p className="muted">
            {role === 'admin'
              ? 'Authorized administrator access for GynAura Indore'
              : 'Passwordless OTP access for GynAura users & gynecologists'}
          </p>
        </div>

        <div className="login-roles" role="tablist" aria-label="Account role">
          <button
            type="button"
            className={`login-role ${role === 'patient' ? 'on' : ''}`}
            onClick={() => handleRoleChange('patient')}
          >
            User Sign In
          </button>
          <button
            type="button"
            className={`login-role ${role === 'doctor' ? 'on' : ''}`}
            onClick={() => handleRoleChange('doctor')}
          >
            Doctor (Gynecologist)
          </button>
        </div>

        {role === 'admin' ? (
          <>
            {googleEnabled && (
              <div style={{ marginTop: 14, marginBottom: 16 }}>
                <div
                  ref={googleBtnRef}
                  style={{ display: 'flex', justifyContent: 'center', margin: '12px 0', minHeight: 44 }}
                />
                {googleLoading && (
                  <div className="ws-sub" style={{ textAlign: 'center', marginTop: 6 }}>
                    Verifying Google account…
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    margin: '16px 0 12px',
                    gap: 10,
                  }}
                >
                  <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                  <span
                    style={{
                      fontSize: '0.74rem',
                      color: 'var(--mut)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    or enter admin key
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                </div>
              </div>
            )}

            {error && <div className="login-error">{error}</div>}

            <form onSubmit={handleAdminLogin} className="login-form">
              <label className="login-field">
                <span>Admin Access Key</span>
                <input
                  type="password"
                  placeholder="Enter admin key (dev: gyncare-admin-2026)"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  required
                />
              </label>
              <button type="submit" className="btn full" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In to Admin Portal'}
              </button>
            </form>
          </>
        ) : (
          <>
            {/* Google OAuth Section */}
            <div style={{ marginTop: 14, marginBottom: 16 }}>
              {googleEnabled ? (
                <div
                  ref={googleBtnRef}
                  style={{ display: 'flex', justifyContent: 'center', margin: '12px 0', minHeight: 44 }}
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--line)',
                    fontSize: '0.78rem',
                    color: 'var(--mut)',
                    textAlign: 'center',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google OAuth ready — add GOOGLE_CLIENT_ID in Render Environment to activate</span>
                </div>
              )}

              {googleLoading && (
                <div className="ws-sub" style={{ textAlign: 'center', marginTop: 6 }}>
                  Verifying Google account…
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  margin: '16px 0 12px',
                  gap: 10,
                }}
              >
                <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                <span
                  style={{
                    fontSize: '0.74rem',
                    color: 'var(--mut)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  or continue with OTP / Demo
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              </div>
            </div>

            {role === 'patient' && (
              <div className="login-modes">
                <button
                  type="button"
                  className={`login-mode ${mode === 'signin' ? 'on' : ''}`}
                  onClick={() => handleModeChange('signin')}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`login-mode ${mode === 'register' ? 'on' : ''}`}
                  onClick={() => handleModeChange('register')}
                >
                  New User
                </button>
              </div>
            )}

            <div className="demo-chips">
              <span className="demo-label">Quick Demo:</span>
              {DEMO_USERS.map((d) => (
                <button
                  key={d.phone}
                  type="button"
                  className="demo-chip"
                  onClick={() => applyDemo(d)}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {error && <div className="login-error">{error}</div>}

            {mode === 'signin' ? (
              step === 1 ? (
                <form onSubmit={handleRequestOtp} className="login-form">
                  <label className="login-field">
                    <span>Mobile Number</span>
                    <input
                      type="tel"
                      inputMode="tel"
                      maxLength={14}
                      placeholder="9876543210 or +919876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </label>
                  <button type="submit" className="btn full" disabled={loading}>
                    {loading ? 'Sending OTP…' : 'Send OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="login-form">
                  {smsSent && (
                    <div className="login-demo-otp" style={{ marginBottom: 10 }}>
                      <span className="badge-ok">Verification code sent via SMS.</span>
                    </div>
                  )}
                  {!smsSent && demoOtp && (
                    <div className="login-demo-otp" style={{ marginBottom: 10 }}>
                      <span className="badge-plum">Demo Mode OTP: {demoOtp} (SMS gateway not configured)</span>
                    </div>
                  )}
                  <label className="login-field">
                    <span>Enter 6-Digit OTP sent to {phone}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="••••••"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                    />
                  </label>
                  <button type="submit" className="btn full" disabled={loading}>
                    {loading ? 'Verifying…' : 'Verify & Continue'}
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                    <button
                      type="button"
                      className="ghost"
                      disabled={cooldown > 0 || loading}
                      onClick={handleRequestOtp}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: cooldown > 0 || loading ? 'not-allowed' : 'pointer',
                        padding: 0,
                        fontSize: '0.84rem'
                      }}
                    >
                      {cooldown > 0 ? `Resend OTP (${cooldown}s)` : 'Resend OTP'}
                    </button>
                    <button
                      type="button"
                      className="ghost login-back"
                      onClick={() => {
                        setStep(1);
                        setOtp('');
                        setDemoOtp('');
                        setSmsSent(false);
                        setCooldown(0);
                        setError('');
                      }}
                    >
                      Change mobile number
                    </button>
                  </div>
                </form>
              )
            ) : (
              <form onSubmit={handleRegister} className="login-form">
                <label className="login-field">
                  <span>Full Name</span>
                  <input
                    type="text"
                    placeholder="Ananya Joshi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </label>
                <div className="login-row">
                  <label className="login-field">
                    <span>Age</span>
                    <input
                      type="number"
                      min={12}
                      max={100}
                      placeholder="27"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      required
                    />
                  </label>
                  <label className="login-field">
                    <span>Mobile Phone</span>
                    <input
                      type="tel"
                      inputMode="tel"
                      maxLength={14}
                      placeholder="9876543210 or +919876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </label>
                </div>
                <label className="login-field">
                  <span>Care Focus</span>
                  <select value={tag} onChange={(e) => setTag(e.target.value)}>
                    {CARE_FOCUSES.map((focus) => (
                      <option key={focus} value={focus}>
                        {focus}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="btn full" disabled={loading}>
                  {loading ? 'Creating Profile…' : 'Create User Profile'}
                </button>
              </form>
            )}
          </>
        )}

        <p className="login-disclaimer">
          Educational &amp; demo preview for GynAura Indore. OTPs are simulated locally.
        </p>

        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <button
            type="button"
            className="ghost"
            onClick={() => handleRoleChange(role === 'admin' ? 'patient' : 'admin')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              fontSize: '0.76rem',
              color: 'var(--mut)',
              cursor: 'pointer',
            }}
          >
            {role === 'admin' ? '← Back to User / Doctor Sign In' : 'GynAura Admin Portal →'}
          </button>
        </div>
      </div>
    </section>
  );
}
