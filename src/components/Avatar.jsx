import { avatarGradient, initials } from '../lib/format'

// .av from the mockups: initials on the member's colour gradient.
export function Av({ person, className = 'av', style, flat }) {
  const bg = flat ? (person?.color || '#ff5fa2') : avatarGradient(person?.color)
  return <div className={className} style={{ background: bg, ...style }} title={person?.display_name}>{initials(person?.display_name)}</div>
}

// Overlapping stack with the "+N" overflow cell.
export function Stack({ people, max = 4, onClick, className = 'stack' }) {
  const shown = people.slice(0, max)
  const extra = people.length - shown.length
  return (
    <div className={className} onClick={onClick} role={onClick ? 'button' : undefined}>
      {shown.map((p) => <Av key={p.id} person={p} />)}
      {extra > 0 && <div className="av" style={{ background: '#2a0f22', color: 'var(--pink-soft)', fontSize: 11 }}>+{extra}</div>}
    </div>
  )
}
