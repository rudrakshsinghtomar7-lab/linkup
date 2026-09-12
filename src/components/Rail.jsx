import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { avatarGradient, initials } from '../lib/format'
import CrewMenu from './CrewMenu'
import { useSession } from '../providers/SessionProvider'

// HUD rail from the mockups. `items`: [{ key, tip, icon, onClick }]. Badge → NOW.
export default function Rail({ items, active }) {
  const { me } = useSession()
  const nav = useNavigate()
  const [menu, setMenu] = useState(false)
  return (
    <aside className="rail">
      <button className="badge" onClick={() => nav('/now')} aria-label="LinkUp">L</button>
      <nav className="nav" style={{ '--active-idx': Math.max(0, items.findIndex((i) => i.key === active)), '--tab-count': items.length }} data-active={items.findIndex((i) => i.key === active)}>
        <span className="nav-pill" aria-hidden />
        {items.map((it) => (
          <button key={it.key} className={active === it.key ? 'on' : ''} onClick={it.onClick} aria-label={it.tip}>
            <span className="tip">{it.tip}</span><span className="nav-ic">{it.icon()}</span><span className="lab">{it.tip}</span>
          </button>
        ))}
      </nav>
      <div className="me" style={{ background: avatarGradient(me?.color) }} onClick={() => setMenu(true)} role="button" aria-label="Crew menu">{initials(me?.display_name)}</div>
      {menu && <CrewMenu onClose={() => setMenu(false)} />}
    </aside>
  )
}
