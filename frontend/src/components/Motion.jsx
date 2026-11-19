import React, { useEffect, useState } from 'react'

export function CountUp({ to, decimals = 0, suffix = '', duration = 1200 }) {
  const [val, setVal] = useState(0)

  useEffect(() => {
    let raf
    const start = performance.now()
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(to * eased)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [to, duration])

  const formatted = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString('en-IN')
  return <>{formatted}{suffix}</>
}

export function TypeCycle({ words, interval = 2600 }) {
  const [idx, setIdx] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setIdx((i) => (i + 1) % words.length)
        setFading(false)
      }, 240)
    }, interval)
    return () => clearInterval(id)
  }, [words.length, interval])

  return <em className={`word-cycle ${fading ? 'out' : ''}`}>{words[idx]}</em>
}

export function TiltCard({ children, className = '' }) {
  const [state, setState] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, hover: false })

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    setState({
      rx: ((0.5 - py) * 8).toFixed(2),
      ry: ((px - 0.5) * 8).toFixed(2),
      gx: (px * 100).toFixed(1),
      gy: (py * 100).toFixed(1),
      hover: true,
    })
  }

  return (
    <div
      className={`tilt-3d ${className}`}
      onMouseMove={onMove}
      onMouseLeave={() => setState({ rx: 0, ry: 0, gx: 50, gy: 50, hover: false })}
      style={{
        transform: `perspective(1000px) rotateX(${state.rx}deg) rotateY(${state.ry}deg) scale(${state.hover ? 1.01 : 1})`,
        transition: state.hover ? 'transform .1s ease-out' : 'transform .45s cubic-bezier(.22,1,.36,1)',
      }}
    >
      <div
        className="tilt-glare"
        style={{
          opacity: state.hover ? 1 : 0,
          background: `radial-gradient(320px circle at ${state.gx}% ${state.gy}%, rgba(247,200,229,.22), transparent 60%)`,
        }}
      />
      {children}
    </div>
  )
}
