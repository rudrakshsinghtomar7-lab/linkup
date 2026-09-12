import { useMemo } from 'react'

// The live feed is derived from real rows already loaded for this crew:
// plans (dropped / expired), RSVPs and location updates. Nothing is manufactured.
export function useActivity({ plans, rsvps, locations, members, userId }) {
  return useMemo(() => {
    const byId = Object.fromEntries((members || []).map((m) => [m.id, m]))
    const who = (id, fallback) => (id === userId ? 'You' : byId[id]?.display_name || fallback?.display_name || 'Someone')
    const person = (id, fallback) => byId[id] || fallback || { display_name: '?' }
    const now = Date.now()
    const items = []

    for (const p of plans || []) {
      items.push({ key: `plan:${p.id}`, at: p.created_at, person: person(p.created_by),
        text: <><b>{who(p.created_by)}</b> dropped {p.emoji} {p.title}{p.location ? ` · ${p.location}` : ''}</> })
      if (p.expires_at && new Date(p.expires_at).getTime() < now) {
        const ins = (rsvps || []).filter((r) => r.plan_id === p.id && r.status === 'in').length
        items.push({ key: `exp:${p.id}`, at: p.expires_at, person: person(p.created_by),
          text: <>{p.emoji} <b>{p.title}</b> expired{ins === 0 ? ' with no takers' : ` · ${ins} went`}</> })
      }
    }
    const planTitle = Object.fromEntries((plans || []).map((p) => [p.id, p]))
    for (const r of rsvps || []) {
      const p = planTitle[r.plan_id]; if (!p) continue
      const me = r.user_id === userId
      const verb = r.status === 'in' ? (me ? 'are in for' : 'is in for') : r.status === 'maybe' ? 'might come to' : 'can’t make'
      items.push({ key: `rsvp:${r.plan_id}:${r.user_id}`, at: r.updated_at, person: person(r.user_id, r.profiles),
        text: <><b>{who(r.user_id, r.profiles)}</b> {verb} {p.emoji} {p.title}</> })
    }
    for (const l of locations || []) {
      if (!l.updated_at) continue
      const me = l.user_id === userId
      if (l.ghost) {
        if (me) items.push({ key: `loc:${l.user_id}`, at: l.updated_at, person: person(l.user_id), text: <><b>You</b> went 👻 ghost — location hidden</> })
        continue
      }
      if (l.status) items.push({ key: `loc:${l.user_id}`, at: l.updated_at, person: person(l.user_id), text: <><b>{who(l.user_id)}</b> {me ? 'are' : 'is'} {l.status}</> })
      else if (l.lat != null && l.lng != null) items.push({ key: `loc:${l.user_id}`, at: l.updated_at, person: person(l.user_id), text: <><b>{who(l.user_id)}</b> updated {me ? 'your' : 'their'} location</> })
    }
    return items.filter((i) => i.at).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 12)
  }, [plans, rsvps, locations, members, userId])
}
