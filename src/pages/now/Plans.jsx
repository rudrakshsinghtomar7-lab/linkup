import { Icon } from '../../components/Icons'
import { useToast } from '../../providers/ToastProvider'
import { friendly, fmtTime } from '../../lib/format'

const DAY = 86400e3

// "7:30 / TONIGHT", "Sat / THIS WK", "26 Jun / 9:00", or "gone / 10am" for expired plans.
function when(p) {
  const now = new Date()
  const expired = p.expires_at && new Date(p.expires_at) < now
  const s = p.starts_at ? new Date(p.starts_at) : null
  if (expired) return { big: 'gone', small: s ? fmtTime(s) : '', gone: true }
  if (!s) return { big: 'open', small: 'ANYTIME' }
  const sameDay = s.toDateString() === now.toDateString()
  const tomorrow = new Date(now.getTime() + DAY).toDateString() === s.toDateString()
  if (sameDay) return { big: fmtTime(s), small: s.getHours() >= 17 ? 'TONIGHT' : 'TODAY' }
  if (tomorrow) return { big: fmtTime(s), small: 'TOMORROW' }
  if (s - now < 7 * DAY) return { big: s.toLocaleDateString([], { weekday: 'short' }), small: 'THIS WK' }
  return { big: s.toLocaleDateString([], { day: 'numeric', month: 'short' }), small: fmtTime(s) }
}

export default function Plans({ data, members, userId, onDrop }) {
  const { plans, rsvps, loading, error, reload, rsvp, pending } = data
  const toast = useToast()
  const byId = Object.fromEntries(members.map((m) => [m.id, m]))

  async function pick(planId, status) {
    try { await rsvp(planId, status) } catch (err) { toast(friendly(err, 'Couldn’t save your RSVP. Try again.')) }
  }

  return (
    <section className="card" id="plans">
      <div className="head">
        <h2><span className="ic"><Icon.clock /></span>Tonight & this week</h2>
        <button className="link" onClick={onDrop}>＋ Drop a plan</button>
      </div>
      {loading ? <div className="state">Loading plans…</div>
        : error ? <div className="state err">Couldn’t load plans.<button className="link" onClick={reload}>Retry</button></div>
        : plans.length === 0 ? <div className="state">Nothing on. Drop a plan and see who’s keen.</div>
        : plans.map((p) => {
          const w = when(p)
          const mine = rsvps.find((r) => r.plan_id === p.id && r.user_id === userId)?.status
          const going = rsvps.filter((r) => r.plan_id === p.id && r.status === 'in')
          const by = p.created_by === userId ? 'you' : p.profiles?.display_name || 'someone'
          return (
            <div className={`plan ${w.gone ? 'gone' : ''}`} key={p.id}>
              <div className="ph">
                <div className="emoji">{p.emoji || '📍'}</div>
                <div className="pt"><strong>{p.title}</strong>
                  <small>{w.gone ? `Expired · ${going.length === 0 ? 'nobody made it 😴' : `${going.length} went`}` : `${[p.place_name, p.location].filter(Boolean).join(' · ') || 'Somewhere'} · ${by} dropped this`}</small></div>
                <div className={`when ${w.gone ? 'gone' : ''}`}>{w.big}<small>{w.small}</small></div>
              </div>
              {!w.gone && (
                <div className="rsvp">
                  <div className="going">
                    {going.slice(0, 3).map((r) => { const pr = byId[r.user_id] || r.profiles; return <div className="av" key={r.user_id} style={{ background: pr?.color || '#ff5fa2' }} title={pr?.display_name}>{(pr?.display_name || '?')[0].toUpperCase()}</div> })}
                    {going.length > 3 && <div className="av" style={{ background: '#2a0f22', color: 'var(--pink-soft)', fontSize: 9 }}>+{going.length - 3}</div>}
                    {going.length === 0 && <small className="state" style={{ padding: 0 }}>No one yet</small>}
                  </div>
                  <button className={`rb ${mine === 'in' ? 'in' : ''}`} disabled={!!pending[p.id]} onClick={() => pick(p.id, 'in')}>I'm in</button>
                  <button className={`rb maybe ${mine === 'maybe' ? 'sel' : ''}`} disabled={!!pending[p.id]} onClick={() => pick(p.id, 'maybe')}>Maybe</button>
                  <button className={`rb out ${mine === 'out' ? 'sel' : ''}`} disabled={!!pending[p.id]} onClick={() => pick(p.id, 'out')}>Can't</button>
                </div>
              )}
            </div>
          )
        })}
    </section>
  )
}
