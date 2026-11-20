import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Icon, I } from './Icons.jsx';

export function TopBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('gynaura_theme') : null;
    const initial = saved === 'light' ? 'light' : 'dark';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', initial);
    }
    return initial;
  });
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isWorkspace = ['/user', '/patient', '/doctor', '/admin', '/login'].some((p) =>
    location.pathname.startsWith(p)
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gynaura_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const closeMobile = () => setMobileOpen(false);

  const themeLabel = theme === 'dark' ? '☀ Light' : '☾ Dark';

  if (isWorkspace) {
    return null;
  }

  return (
    <header className="nav fixed-nav">
      <div className="wrap navin">
        <Link className="brand" to="/" onClick={closeMobile}>
          <span className="logo">G</span>GynAura
        </Link>

        {/* Center Navigation */}
        <div className="nav-center-cluster">
          {isHome && (
            <nav className="desktop-nav" aria-label="Main website">
              <a href="#overview">Overview</a>
              <a href="#specialties">Specialties</a>
              <a href="#how-it-works">How It Works</a>
              <a href="#book">Book Visit</a>
            </nav>
          )}
        </div>

        {/* Right Action Cluster — Pure Website Actions (No Login / Logout) */}
        <div className="navcta">
          <button
            type="button"
            className="ws-btn"
            onClick={toggleTheme}
            aria-label="Toggle color theme"
          >
            {themeLabel}
          </button>
          <Link to="/user" className="btn sm">
            Try the App
          </Link>
          <button
            className="menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            <Icon d={mobileOpen ? I.close : I.menu} size={18} />
          </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      {mobileOpen && (
        <nav className="mobile-nav" aria-label="Mobile website">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'on' : '')} onClick={closeMobile}>
            Home
          </NavLink>
          {isHome && (
            <>
              <a href="#overview" onClick={closeMobile}>Overview</a>
              <a href="#specialties" onClick={closeMobile}>Specialties</a>
              <a href="#how-it-works" onClick={closeMobile}>How It Works</a>
              <a href="#book" onClick={closeMobile}>Book Visit</a>
            </>
          )}
          <Link to="/user" className="btn sm mobile-btn-cta" onClick={closeMobile}>
            Try the App
          </Link>
          <button
            type="button"
            className="ws-btn mobile-btn-cta"
            onClick={toggleTheme}
            aria-label="Toggle color theme"
          >
            {themeLabel}
          </button>
        </nav>
      )}
    </header>
  );
}
