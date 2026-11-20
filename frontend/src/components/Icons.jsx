import React from 'react'

export const Icon = ({ d, size = 20 }) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

export const I = {
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z',
  wave: 'M2 12h4l3-8 4 16 3-8h6',
  check: 'M20 6 9 17l-5-5',
  cal: 'M3 5h18v16H3zM16 3v4M8 3v4M3 10h18',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  flask: 'M9 3h6M10 3v6L4 19a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-6-10V3',
  user: 'M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z',
  pin: 'M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  star: 'M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.8 5.8 21.1l1.4-7L2 9.3l7-.8z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M18 6 6 18M6 6l12 12',
  clip: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z',
}

export const Avatar = ({ label = 'Dr', big }) => (
  <div className={`avatar ${big ? 'big' : ''}`}>
    <svg viewBox="0 0 200 240" preserveAspectRatio="xMidYMax meet">
      <circle cx="100" cy="88" r="44" fill="#e9c6b3" />
      <path d="M52 90c0-40 22-62 48-62s48 22 48 62c-8-22-26-32-48-32S60 68 52 90z" fill="#3b2433" />
      <path d="M20 240c4-60 40-90 80-90s76 30 80 90z" fill="#fff" />
      <path d="M84 150l16 40 16-40" fill="#f3e6ef" />
      <path d="M72 160c-6 20-4 40 6 52" stroke="#5b1f4a" strokeWidth="4" fill="none" />
      <circle cx="80" cy="214" r="7" fill="#5b1f4a" />
    </svg>
    <span className="sr">{label}</span>
  </div>
)
