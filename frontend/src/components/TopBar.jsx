import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icon, I } from './Icons.jsx';
import { apiPost, clearSession, getSession } from '../api.js';

export function TopBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [session, setSessionState] = useState(() => getSession());
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const syncAuth = () => setSessionState(getSession());
    window.addEventListener('gynaura-auth', syncAuth);
    window.addEventListener('storage', syncAuth);
    return () => {
      window.removeEventListener('gynaura-auth', syncAuth);
      window.removeEventListener('storage', syncAuth);
    };
  }, []);

  const closeMobile = () => setMobileOpen(false);

  const handleLogout = () => {
    apiPost('/auth/logout', {}).catch(() => {});
    clearSession();
    closeMobile();
    navigate('/');
  };

  const isSignedIn = Boolean(session?.token);
  const portalPath =
    session?.role === 'admin'
      ? '/admin'
      : session?.role === 'doctor'
        ? '/doctor'
        : '/user';
  const portalLabel =
    session?.role === 'admin'
      ? 'Admin Portal'
      : session?.role === 'doctor'
        ? 'Doctor Console'
        : 'My Health Hub';
  const roleBadgeLabel =
    session?.role === 'admin'
      ? 'Admin'
      : session?.role === 'doctor'
        ? 'Doctor'
        : 'User';

  return (
    <header className="nav fixed-nav">
      <div className="wrap navin">
        <Link className="brand" to="/" onClick={closeMobile}>
          <span className="logo">G</span>GynAura
        </Link>

        {/* Center Navigation */}
        <div className="nav-center-cluster">
          {!isSignedIn && isHome && (
            <div className="desktop-nav">
              <a href="#overview">Overview</a>
              <a href="#specialties">Specialties</a>
              <a href="#for-doctors">For Doctors</a>
              <a href="#book">Book Visit</a>
            </div>
          )}

          {isSignedIn && (
            <div className="desktop-nav">
              <NavLink to={portalPath} className={({ isActive }) => (isActive ? 'on' : '')}>
                {portalLabel}
              </NavLink>
            </div>
          )}
        </div>

        {/* Right Action Cluster */}
        <div className="navcta">
          {isSignedIn ? (
            <>
              <Link to={portalPath} className="user-pill">
                <span>{session.user?.name || (session.role === 'admin' ? 'Admin' : 'Account')}</span>
                <span className="badge-plum">{roleBadgeLabel}</span>
              </Link>
              <button type="button" className="ws-btn" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="ghost">
                Sign In
              </Link>
              <Link to="/#book" className="btn sm">
                Book Visit
              </Link>
            </>
          )}
          <button
            className="menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            <Icon d={mobileOpen ? I.close : I.menu} size={18} />
          </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      {mobileOpen && (
        <div className="mobile-nav">
          {isSignedIn ? (
            <>
              <NavLink
                to={portalPath}
                className={({ isActive }) => (isActive ? 'on' : '')}
                onClick={closeMobile}
              >
                {portalLabel}
              </NavLink>
              <button type="button" className="ws-btn mobile-btn-cta" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/" end className={({ isActive }) => (isActive ? 'on' : '')} onClick={closeMobile}>
                Home
              </NavLink>
              {isHome && (
                <>
                  <a href="#overview" onClick={closeMobile}>Overview</a>
                  <a href="#specialties" onClick={closeMobile}>Specialties</a>
                  <a href="#for-doctors" onClick={closeMobile}>For Doctors</a>
                  <a href="#book" onClick={closeMobile}>Book Visit</a>
                </>
              )}
              <Link to="/login" onClick={closeMobile}>
                Sign In
              </Link>
              <Link to="/#book" className="btn sm mobile-btn-cta" onClick={closeMobile}>
                Book Visit
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
