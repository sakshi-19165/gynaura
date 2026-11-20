import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, setSession, clearSession } from '../api.js';

const CARE_FOCUSES = ['Antenatal', 'PCOS', 'Fertility', 'General'];

const PASSWORD_RULES = [
  { key: 'len', label: '8+ characters' },
  { key: 'upper', label: 'Uppercase (A-Z)' },
  { key: 'lower', label: 'Lowercase (a-z)' },
  { key: 'num', label: 'Number (0-9)' },
  { key: 'special', label: 'Special char (!@#$…)' },
];

function checkPasswordRules(pw) {
  return {
    len: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    num: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

function isPasswordStrong(rules) {
  return Object.values(rules).every(Boolean);
}

function PasswordInput({
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
  autoComplete,
  required = true,
}) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{ paddingRight: 52 }}
        autoComplete={autoComplete}
        required={required}
      />
      <button
        type="button"
        onClick={onToggleShow}
        aria-label={show ? 'Hide password' : 'Show password'}
        style={{
          position: 'absolute',
          right: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'transparent',
          border: 'none',
          color: 'var(--mut)',
          fontSize: '0.74rem',
          fontWeight: 600,
          cursor: 'pointer',
          padding: '2px 4px',
        }}
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

function PasswordChecklist({ password }) {
  const rules = checkPasswordRules(password);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '4px 10px',
        marginTop: 6,
        padding: '8px 10px',
        borderRadius: 10,
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--line)',
      }}
    >
      {PASSWORD_RULES.map((rule) => {
        const passed = rules[rule.key];
        return (
          <span
            key={rule.key}
            style={{
              fontSize: '0.74rem',
              color: passed ? 'var(--ok)' : 'var(--mut)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span aria-hidden="true">{passed ? '✓' : '○'}</span>
            <span>{rule.label}</span>
          </span>
        );
      })}
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();

  const [role, setRole] = useState('patient');
  const [mode, setMode] = useState('signin'); // 'signin' | 'register'

  // Flow A: Sign In state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Flow B: New User registration fields
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [tag, setTag] = useState('Antenatal');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Flow C: Google OAuth & Post-Google Password Setup / Verification
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [requiresPasswordVerify, setRequiresPasswordVerify] = useState(false);
  const [googleVerifyUser, setGoogleVerifyUser] = useState(null);
  const [googleVerifyPassword, setGoogleVerifyPassword] = useState('');
  const [showGoogleVerifyPassword, setShowGoogleVerifyPassword] = useState(false);
  const [googleSession, setGoogleSession] = useState(null);
  const [googlePassword, setGooglePassword] = useState('');
  const [showGooglePassword, setShowGooglePassword] = useState(false);
  const googleBtnRef = useRef(null);
  const roleRef = useRef(role);

  // Admin Login State
  const [adminKey, setAdminKey] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const regRules = checkPasswordRules(regPassword);
  const regStrong = isPasswordStrong(regRules);
  const googleRules = checkPasswordRules(googlePassword);
  const googleStrong = isPasswordStrong(googleRules);

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
      if (res?.needs_password) {
        setGoogleSession({ token: res.token, role: res.role, user: res.user });
        setNeedsPassword(true);
        setRequiresPasswordVerify(false);
        setGooglePassword('');
        setShowGooglePassword(false);
        return;
      }
      if (res?.requires_password_verify) {
        setGoogleVerifyUser({ ...res.user, role: res.role || roleRef.current });
        setRequiresPasswordVerify(true);
        setNeedsPassword(false);
        setGoogleVerifyPassword('');
        setShowGoogleVerifyPassword(false);
        return;
      }
      setSession({ token: res.token, role: res.role, user: res.user });
      navigate(res.role === 'admin' ? '/admin' : res.role === 'doctor' ? '/doctor' : '/user');
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again or sign in with your password.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleVerifyGooglePassword = async (e) => {
    e.preventDefault();
    if (!googleVerifyUser) return;
    if (!googleVerifyPassword) {
      setError('Please enter your account password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiPost('/auth/login', {
        identifier: googleVerifyUser.email || googleVerifyUser.phone,
        password: googleVerifyPassword,
        role: googleVerifyUser.role || role,
      });
      setSession({ token: res.token, role: res.role, user: res.user });
      navigate(res.role === 'admin' ? '/admin' : res.role === 'doctor' ? '/doctor' : '/user');
    } catch (err) {
      setError(err.message || 'Incorrect password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!googleClientId || !googleEnabled || needsPassword || requiresPasswordVerify) return;

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
  }, [googleClientId, googleEnabled, role, needsPassword, requiresPasswordVerify]);

  const handleRoleChange = (nextRole) => {
    setRole(nextRole);
    if (nextRole === 'doctor' || nextRole === 'admin') {
      setMode('signin');
    }
    setAdminKey('');
    setNeedsPassword(false);
    setRequiresPasswordVerify(false);
    setGoogleVerifyUser(null);
    setGoogleVerifyPassword('');
    setGoogleSession(null);
    setGooglePassword('');
    setError('');
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    setError('');
  };

  const applyDemo = (demo) => {
    setRole(demo.role);
    setMode('signin');
    setIdentifier(demo.phone);
    setPassword('');
    setShowPassword(false);
    setNeedsPassword(false);
    setRequiresPasswordVerify(false);
    setGoogleVerifyUser(null);
    setGoogleSession(null);
    setError('');
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    const idTrimmed = identifier.trim();
    if (!idTrimmed) {
      setError('Please enter your phone number or email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await apiPost('/auth/login', {
        identifier: idTrimmed,
        password,
        role,
      });
      setSession({ token: res.token, role: res.role, user: res.user });
      navigate(res.role === 'admin' ? '/admin' : res.role === 'doctor' ? '/doctor' : '/user');
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please check and try again.');
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
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    const targetPhone = raw.startsWith('+') ? '+' + digits : digits;
    const parsedAge = Number(age);
    if (!parsedAge || parsedAge < 12 || parsedAge > 100) {
      setError('Please enter a valid age.');
      return;
    }
    if (!regStrong) {
      setError('Please satisfy all 5 strong password requirements.');
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
        password: regPassword,
      });
      setSession({ token: res.token, role: res.role || 'patient', user: res.user });
      navigate('/user');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetGooglePassword = async (e) => {
    e.preventDefault();
    if (!googleSession?.token) {
      setError('Google session expired. Please sign in with Google again.');
      setNeedsPassword(false);
      return;
    }
    if (!googleStrong) {
      setError('Please satisfy all 5 strong password requirements.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      setSession(googleSession);
      const res = await apiPost('/auth/set-password', { password: googlePassword });
      const finalSession = {
        token: res?.token || googleSession.token,
        role: res?.role || googleSession.role,
        user: res?.user || googleSession.user,
      };
      setSession(finalSession);
      navigate(finalSession.role === 'admin' ? '/admin' : finalSession.role === 'doctor' ? '/doctor' : '/user');
    } catch (err) {
      clearSession();
      setError(err.message || 'Unable to set password. Please try again.');
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Link to="/" className="ws-btn" style={{ height: 28, fontSize: '.76rem', padding: '0 10px' }}>
            ← Main Website
          </Link>
          <span className="badge-plum">GynAura Web App</span>
        </div>
        <div className="login-head">
          <div className="brand">
            <span className="logo">G</span>GynAura
          </div>
          <h1>
            {needsPassword
              ? 'Create Your Strong Password'
              : requiresPasswordVerify
              ? `Welcome back, ${googleVerifyUser?.name || 'User'}`
              : role === 'admin'
              ? 'GynAura Admin Portal'
              : 'Sign in to GynAura Web App'}
          </h1>
          <p className="muted">
            {needsPassword
              ? 'One last step — set a strong custom password for your GynAura account'
              : requiresPasswordVerify
              ? `Google account (${googleVerifyUser?.email}) verified — enter your custom GynAura password to continue`
              : role === 'admin'
              ? 'Authorized administrator access for GynAura Indore'
              : 'Secure password & Google access for GynAura users & gynecologists'}
          </p>
        </div>

        {requiresPasswordVerify ? (
          <>
            {error && <div className="login-error" role="alert">{error}</div>}
            <form onSubmit={handleVerifyGooglePassword} className="login-form">
              <label className="login-field">
                <span>Account Password</span>
                <PasswordInput
                  value={googleVerifyPassword}
                  onChange={(e) => setGoogleVerifyPassword(e.target.value)}
                  show={showGoogleVerifyPassword}
                  onToggleShow={() => setShowGoogleVerifyPassword((prev) => !prev)}
                  placeholder="Enter your GynAura password"
                  autoComplete="current-password"
                />
              </label>
              <button type="submit" className="btn full" disabled={loading}>
                {loading ? 'Verifying Password…' : 'Verify Password & Enter Web App'}
              </button>
            </form>
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setRequiresPasswordVerify(false);
                  setGoogleVerifyUser(null);
                  setGoogleVerifyPassword('');
                  setError('');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  fontSize: '0.78rem',
                  color: 'var(--mut)',
                  cursor: 'pointer',
                }}
              >
                ← Use another account
              </button>
            </div>
          </>
        ) : needsPassword ? (
          <>
            {error && <div className="login-error">{error}</div>}
            <form onSubmit={handleSetGooglePassword} className="login-form">
              <label className="login-field">
                <span>Strong Password</span>
                <PasswordInput
                  value={googlePassword}
                  onChange={(e) => setGooglePassword(e.target.value)}
                  show={showGooglePassword}
                  onToggleShow={() => setShowGooglePassword((prev) => !prev)}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                />
                <PasswordChecklist password={googlePassword} />
              </label>
              <button type="submit" className="btn full" disabled={loading || !googleStrong}>
                {loading ? 'Saving Password…' : 'Save Password & Continue'}
              </button>
            </form>
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setNeedsPassword(false);
                  setGoogleSession(null);
                  setGooglePassword('');
                  setError('');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  fontSize: '0.78rem',
                  color: 'var(--mut)',
                  cursor: 'pointer',
                }}
              >
                ← Back to Sign In
              </button>
            </div>
          </>
        ) : (
          <>
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
                      placeholder="Enter temporary admin access key"
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
                      or continue with password
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

                {error && <div className="login-error">{error}</div>}

                {mode === 'signin' ? (
                  <form onSubmit={handleSignIn} className="login-form">
                    <label className="login-field">
                      <span>Phone or Email</span>
                      <input
                        type="text"
                        placeholder="9876543210 or email@example.com"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        autoComplete="username"
                        required
                      />
                    </label>
                    <label className="login-field">
                      <span>Password</span>
                      <PasswordInput
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        show={showPassword}
                        onToggleShow={() => setShowPassword((prev) => !prev)}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                      />
                    </label>
                    <button type="submit" className="btn full" disabled={loading}>
                      {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                  </form>
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
                        <span>10-Digit Phone</span>
                        <input
                          type="tel"
                          inputMode="tel"
                          maxLength={14}
                          placeholder="9876543210"
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
                    <label className="login-field">
                      <span>Strong Password</span>
                      <PasswordInput
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        show={showRegPassword}
                        onToggleShow={() => setShowRegPassword((prev) => !prev)}
                        placeholder="Create a strong password"
                        autoComplete="new-password"
                      />
                      <PasswordChecklist password={regPassword} />
                    </label>
                    <button type="submit" className="btn full" disabled={loading || !regStrong}>
                      {loading ? 'Creating Profile…' : 'Create User Profile'}
                    </button>
                  </form>
                )}
              </>
            )}

            <p className="login-disclaimer">
              Educational &amp; demo preview for GynAura Indore. Secured with custom password authentication.
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
          </>
        )}
      </div>
    </section>
  );
}
