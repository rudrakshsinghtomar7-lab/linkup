import { Icon } from '../../components/Icons'
import { useToast } from '../../providers/ToastProvider'
import { friendly } from '../../lib/format'

const dow = (d) => new Date(d + 'T00:00:00').toLocaleDateString([], { weekday: 'short' })
const dom = (d) => new Date(d + 'T00:00:00').getDate()

export default function Availability({ trip, members, userId, data, onEditTrip }) {
  const { days, loading, error, reload, isFree, toggle, pending } = data
  const toast = useToast()

  async function flip(day) {
    try { await toggle(day) } catch (err) { toast(friendly(err, 'Couldn’t save that day. Try again.')) }
  }

  // "Everyone free" = every member free that day (mockup: hot slot when the column is full).
  const colFree = days.map((d) => members.filter((m) => isFree(m.id, d)).length)

  return (
    <section className="card" id="calendar">
      <div className="head">
        <h2><span className="ic"><Icon.calendar /></span>Who's free</h2>
        {trip && !trip.start_date && <button className="link" onClick={onEditTrip}>Set trip dates</button>}
      </div>
      {!trip ? <div className="state">Start a trip to mark who’s free.</div>
        : !trip.start_date ? <div className="state">Add dates to the trip and everyone can mark the days they’re free.</div>
        : loading ? <div className="state">Loading availability…</div>
        : error ? <div className="state err">Couldn’t load availability.<button className="link" onClick={reload}>Retry</button></div>
        : (<>
          <div className="calwrap">
            <table className="cal">
              <thead><tr><th></th>{days.map((d) => <th key={d}>{dow(d)}<small>{dom(d)}</small></th>)}</tr></thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="name">{m.id === userId ? 'You' : m.display_name}</td>
                    {days.map((d, ci) => {
                      const free = isFree(m.id, d)
                      const hot = free && members.length > 1 && colFree[ci] === members.length
                      const own = m.id === userId
                      return (
                        <td key={d}>
                          <button className={`slot ${free ? 'free' : ''} ${hot ? 'hot' : ''} ${pending[`${m.id}:${d}`] ? 'pending' : ''}`}
                            disabled={!own || !!pending[`${m.id}:${d}`]} onClick={() => flip(d)}
                            aria-label={`${m.display_name} ${dow(d)} ${dom(d)}: ${free ? 'free' : 'busy'}`} />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="legend">
            <span><i style={{ background: '#241021', border: '1px solid var(--line)' }}></i>Busy</span>
            <span><i style={{ background: 'linear-gradient(135deg,#00e5d0,#065f57)' }}></i>Free</span>
            <span><i style={{ background: 'linear-gradient(135deg,var(--pink),var(--orange))' }}></i>Everyone free</span>
          </div>
        </>)}
    </section>
  )
}
