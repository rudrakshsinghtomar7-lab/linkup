import { useEffect, useState } from 'react'
import { fmtDate } from '../../lib/format'

// Countdown to 9:00 on the trip's start date (as in the mockup).
function useCountdown(startDate) {
  const [t, setT] = useState({ d: '--', h: '--', m: '--' })
  useEffect(() => {
    if (!startDate) { setT({ d: '--', h: '--', m: '--' }); return }
    const target = new Date(startDate + 'T09:00:00')
    const tick = () => {
      const ms = target - new Date()
      const pad = (n) => String(Math.max(0, n)).padStart(2, '0')
      setT({ d: pad(Math.floor(ms / 864e5)), h: pad(Math.floor((ms % 864e5) / 36e5)), m: pad(Math.floor((ms % 36e5) / 6e4)) })
    }
    tick(); const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [startDate])
  return t
}

export default function Hero({ trip, going, onNewTrip }) {
  const c = useCountdown(trip?.start_date)
  return (
    <section className="hero">
      <div className="sun"></div>
      <div className="hero-in">
        {trip ? (
          <div>
            <div className="kick">Next up · locked in by the crew</div>
            <h1>{trip.title}</h1>
            <div className="meta">
              {trip.destination && <span>📍 {trip.destination}</span>}
              {trip.start_date && <span>🗓 {fmtDate(trip.start_date)}{trip.end_date && trip.end_date !== trip.start_date ? ` – ${fmtDate(trip.end_date)}` : ''}</span>}
              <span>👥 {going} going</span>
            </div>
          </div>
        ) : (
          <div>
            <div className="kick">No trip yet</div>
            <h1>Where to<br />next?</h1>
            <div className="meta"><span>Start a trip and the crew can vote on places, mark dates and split costs.</span></div>
            <button className="btn ghost" onClick={onNewTrip}>＋ Start a trip</button>
          </div>
        )}
        <div className="count">
          <div className="cell"><b>{c.d}</b><small>days</small></div>
          <div className="cell"><b>{c.h}</b><small>hrs</small></div>
          <div className="cell"><b>{c.m}</b><small>min</small></div>
        </div>
      </div>
    </section>
  )
}
