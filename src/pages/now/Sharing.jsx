import Modal from '../../components/Modal'
import { Icon } from '../../components/Icons'
import { fmtTime } from '../../lib/format'

// Sharing scope picker. Writes share_scope (+ share_until for "hours") to the user's own row.
export function ScopeModal({ mine, planActive, saving, onPick, onClose, crewName }) {
  const cur = mine?.share_scope || 'plan'
  const opts = [
    { key: 'off', icon: '⏹', label: 'Off', hint: 'never share' },
    { key: 'plan', icon: '📡', label: 'During plans', hint: planActive ? 'a plan is on now' : 'no plan right now' },
    { key: 'hours', icon: '⏱', label: 'For 3 hours', hint: cur === 'hours' && mine?.share_until ? `until ${fmtTime(mine.share_until)}` : 'then off' },
    { key: 'always', icon: '🌐', label: 'Always', hint: 'while the app is open' },
  ]
  return (
    <Modal title="Location sharing" icon={<Icon.map />} onClose={onClose}>
      <p className="state" style={{ paddingTop: 0 }}>Your live spot is shared with <b style={{ color: 'var(--ink)' }}>{crewName}</b> only while LinkUp is open on your phone — web apps can’t share in the background. Ghost mode overrides everything.</p>
      <div className="scope-list">
        {opts.map((o) => (
          <button key={o.key} className={`btn ghost ${cur === o.key ? 'cur' : ''}`} disabled={saving} onClick={() => onPick(o.key)}>
            {o.icon} {o.label}<small>{cur === o.key ? 'current · ' : ''}{o.hint}</small>
          </button>
        ))}
      </div>
    </Modal>
  )
}

// One-screen primer shown before the OS location prompt.
export function PrimerModal({ onEnable, onClose, crewName }) {
  return (
    <Modal title="Turn on live location" icon={<Icon.map />} onClose={onClose}>
      <p className="state" style={{ paddingTop: 0 }}>
        <b style={{ color: 'var(--ink)' }}>What gets shared:</b> your live spot, with {crewName} only.<br />
        <b style={{ color: 'var(--ink)' }}>When:</b> only while sharing is on (default: during plans) and LinkUp is open.<br />
        <b style={{ color: 'var(--ink)' }}>Control:</b> go 👻 Ghost anytime and you vanish instantly.
      </p>
      <p className="state">Your phone will ask for permission next.</p>
      <div className="actions">
        <button className="btn ghost" onClick={onClose}>Not now</button>
        <button className="btn primary" onClick={onEnable}>Turn on</button>
      </div>
    </Modal>
  )
}

// Compact status strip under the ghost banner.
export function GeoBar({ live, mine, planActive, onPrime, onScope }) {
  const scope = mine?.share_scope || 'plan'
  if (!live.supported) return <div className="geo off"><span className="g">📍</span><div className="t">This browser can’t share location.<small>Plans, RSVPs and the feed all still work.</small></div></div>
  if (live.permission === 'denied') return (
    <div className="geo off"><span className="g">📍</span>
      <div className="t">Location is off for LinkUp.<small>The map still works — only your own blip is missing. Allow location for this site in your browser settings, then retry.</small></div>
      <button className="btn ghost" onClick={onPrime}>Retry</button>
    </div>
  )
  if (!live.primed || live.permission === 'prompt' || live.permission === 'unknown') return (
    <div className="geo"><span className="g">📍</span>
      <div className="t">Share your live spot with the crew?<small>Only while the app is open, only when sharing is on. Ghost anytime.</small></div>
      <button className="btn primary" onClick={onPrime}>Turn on</button>
    </div>
  )
  if (live.geoError === 'unavailable' || live.geoError === 'timeout') return (
    <div className="geo off"><span className="g">📍</span><div className="t">Can’t get a fix right now.<small>{live.geoError === 'timeout' ? 'Location timed out — it’ll keep trying.' : 'Position unavailable — check GPS / Wi-Fi.'}</small></div></div>
  )
  if (mine?.ghost) return null // ghost banner already says it
  if (live.broadcasting) return (
    <div className="geo on"><span className="g">📡</span>
      <div className="t">Broadcasting live.<small>{scope === 'always' ? 'Always' : scope === 'hours' ? `Until ${fmtTime(mine.share_until)}` : 'During the current plan'} · updates about every 30s while the app is open{live.lastWrite ? ` · last sent ${new Date(live.lastWrite).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}</small></div>
      <button className="btn ghost" onClick={onScope}>Change</button>
    </div>
  )
  const why = !live.visible ? 'paused in the background' : scope === 'off' ? 'sharing is off' : scope === 'plan' && !planActive ? 'no plan is on right now' : scope === 'hours' ? 'your 3 hours are up' : 'waiting for a fix'
  return (
    <div className="geo off"><span className="g">⏸</span>
      <div className="t">Not broadcasting — {why}.<small>You can still see yourself on the map.</small></div>
      <button className="btn ghost" onClick={onScope}>Change</button>
    </div>
  )
}
