import { useMemo, useState } from 'react'
import { Icon } from '../../components/Icons'
import { useToast } from '../../providers/ToastProvider'
import { useDayPlans } from '../../hooks/useDayPlans'
import { friendly, fmtTime } from '../../lib/format'

const DAY = 86400e3
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayIso = () => iso(new Date())

// DAY segment: a date strip + that day's plans, each with RSVP, a live poll bar and who's free.
export default function DayPlanner({ crewId, members, userId, onPlan }) {
  const [day, setDay] = useState(todayIso)
  const [offset, setOffset] = useState(0) // weeks shifted from today
  const data = useDayPlans(crewId, day, userId)
  const toast = useToast()
  const byId = Object.fromEntries(members.map((m) => [m.id, m]))

  const strip = useMemo(() => {
    const base = new Date(); base.setHours(0, 0, 0, 0); base.setDate(base.getDate() + offset * 7)
    return Array.from({ length: 14 }, (_, i) => { const d = new Date(base.getTime() + i * DAY); return { iso: iso(d), dow: d.toLocaleDateString([], { weekday: 'short' }), dom: d.getDate(), mon: d.toLocaleDateString([], { month: 'short' }) } })
  }, [offset])

  const label = (() => { const d = new Date(day + 'T00:00:00'); const diff = Math.round((d - new Date(todayIso() + 'T00:00:00')) / DAY)
    return diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday' : d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' }) })()

  async function pick(planId, status) { try { await data.rsvp(planId, status) } catch (err) { toast(friendly(err, 'Couldn’t save your RSVP. Try again.')) } }

  return (
    <>
      <section className="card daycard">
        <div className="head">
          <h2><span className="ic"><Icon.calendar /></span>{label}</h2>
          <div className="stripnav">
            <button className="link" onClick={() => setOffset((o) => o - 1)} aria-label="Earlier">‹</button>
            <button className="link" onClick={() => { setOffset(0); setDay(todayIso()) }}>Today</button>
            <button className="link" onClick={() => setOffset((o) => o + 1)} aria-label="Later">›</button>
          </div>
        </div>
        <div className="strip">
          {strip.map((d) => (
            <button key={d.iso} className={`dayb ${d.iso === day ? 'on' : ''} ${d.iso === todayIso() ? 'today' : ''}`} onClick={() => setDay(d.iso)}>
              <small>{d.dow}</small><b>{d.dom}</b><small>{d.mon}</small>
            </button>
          ))}
        </div>
        <button className="btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: 14 }} onClick={() => onPlan(day)}>＋ Plan this day</button>
      </section>

      <section className="card">
        <div className="head"><h2><span className="ic"><Icon.clock /></span>What’s on</h2></div>
        {data.loading ? <div className="state">Loading…</div>
          : data.error ? <div className="state err">Couldn’t load plans.<button className="link" onClick={data.reload}>Retry</button></div>
          : data.plans.length === 0 ? <div className="state">Nothing planned for {label.toLowerCase()} yet. Drop the first idea and see who’s free.</div>
          : data.plans.map((p) => {
            const rs = data.rsvps.filter((r) => r.plan_id === p.id)
            const mine = rs.find((r) => r.user_id === userId)?.status
            const ins = rs.filter((r) => r.status === 'in').length
            const pct = members.length ? Math.round((ins / members.length) * 100) : 0
            const gone = p.expires_at && new Date(p.expires_at) < new Date()
            return (
              <div className={`plan ${gone ? 'gone' : ''}`} key={p.id}>
                <div className="ph">
                  <div className="emoji">{p.emoji || '📍'}</div>
                  <div className="pt"><strong>{p.title}</strong><small>{[p.place_name, p.location].filter(Boolean).join(' · ') || 'Somewhere'} · {p.created_by === userId ? 'you' : p.profiles?.display_name || 'someone'} dropped this</small></div>
                  <div className={`when ${gone ? 'gone' : ''}`}>{p.starts_at ? fmtTime(p.starts_at) : 'open'}<small>{gone ? 'DONE' : 'START'}</small></div>
                </div>
                {/* live poll: share of the crew that's in */}
                <div className="bar-row" style={{ marginTop: 12 }}>
                  <div className="lab"><strong>{ins} of {members.length} in</strong><span>{pct}%</span></div>
                  <div className="track"><div className="fill" style={{ width: `${pct}%` }}></div></div>
                </div>
                {/* who's free: every member, coloured by their answer */}
                <div className="free">
                  {members.map((m) => { const st = rs.find((r) => r.user_id === m.id)?.status || 'none'; return (
                    <div key={m.id} className={`freeav ${st}`} title={`${m.display_name}: ${st === 'in' ? 'in' : st === 'maybe' ? 'maybe' : st === 'out' ? "can't" : 'no answer'}`}>
                      <span className="av" style={{ background: st === 'none' ? '#2a0f22' : m.color }}>{(m.display_name || '?')[0].toUpperCase()}</span>
                      <small>{m.id === userId ? 'You' : m.display_name.split(' ')[0]}</small>
                    </div>) })}
                </div>
                {!gone && (
                  <div className="rsvp">
                    <div className="going"></div>
                    <button className={`rb ${mine === 'in' ? 'in' : ''}`} disabled={!!data.pending[p.id]} onClick={() => pick(p.id, 'in')}>I'm in</button>
                    <button className={`rb maybe ${mine === 'maybe' ? 'sel' : ''}`} disabled={!!data.pending[p.id]} onClick={() => pick(p.id, 'maybe')}>Maybe</button>
                    <button className={`rb out ${mine === 'out' ? 'sel' : ''}`} disabled={!!data.pending[p.id]} onClick={() => pick(p.id, 'out')}>Can't</button>
                  </div>
                )}
              </div>
            )
          })}
      </section>
    </>
  )
}
