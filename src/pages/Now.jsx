import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Rail from '../components/Rail'
import { Icon } from '../components/Icons'
import { navItems } from '../components/nav'
import { Stack } from '../components/Avatar'
import CrewMenu from '../components/CrewMenu'
import PlanModal from '../components/PlanModal'
import LiveMap from './now/LiveMap'
import Plans from './now/Plans'
import Feed from './now/Feed'
import { useSession } from '../providers/SessionProvider'
import { useToast } from '../providers/ToastProvider'
import { usePlans } from '../hooks/usePlans'
import { useLocations } from '../hooks/useLocations'
import { useActivity } from '../hooks/useActivity'
import { useLiveLocation } from '../hooks/useLiveLocation'
import { ScopeModal, PrimerModal, GeoBar } from './now/Sharing'
import { friendly, fmtTime } from '../lib/format'
import '../styles/now.css'


export default function Now() {
  const { activeCrew, members, user, reloadMembers } = useSession()
  const toast = useToast()
  const nav = useNavigate()
  const plans = usePlans(activeCrew.id, user.id)
  const loc = useLocations(activeCrew.id, user.id)
  const feed = useActivity({ plans: plans.plans, rsvps: plans.rsvps, locations: loc.rows, members, userId: user.id })
  // crew_members isn't in the realtime publication: refresh the roster when an unknown member shows up.
  useEffect(() => {
    const known = new Set(members.map((m) => m.id))
    const seen = [...(plans.rsvps || []).map((r) => r.user_id), ...(loc.rows || []).map((r) => r.user_id)]
    if (seen.some((id) => !known.has(id))) reloadMembers()
  }, [plans.rsvps, loc.rows]) // eslint-disable-line react-hooks/exhaustive-deps
  const [drop, setDrop] = useState(false)
  const [crewMenu, setCrewMenu] = useState(false)
  const [share, setShare] = useState(false)
  const [primer, setPrimer] = useState(false)
  const [fullMap, setFullMap] = useState(false)

  // Clock tick (30s) so plan windows and blip staleness re-evaluate without new data.
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id) }, [])

  const ghost = !!loc.mine?.ghost
  // A plan is "on" when now is between its start (or creation) and expiry.
  const planActive = (plans.plans || []).some((p) => {
    const start = new Date(p.starts_at || p.created_at).getTime(); const end = p.expires_at ? new Date(p.expires_at).getTime() : Infinity
    return start <= now && now <= end
  })
  const live = useLiveLocation({ crewId: activeCrew.id, userId: user.id, mine: loc.mine, planActive, onWrote: loc.ping })

  // Ghost mode: locations.ghost on my own row. RLS decides who sees what; we only mirror our own state.
  async function toggleGhost() {
    try { await loc.updateMine({ ghost: !ghost }); toast(ghost ? 'You’re visible to the crew again' : 'Ghost mode on — you’re hidden', 'ok') }
    catch (err) { toast(friendly(err, 'Couldn’t change ghost mode. Try again.')) }
  }

  async function setScope(scope) {
    const patch = scope === 'hours'
      ? { share_scope: 'hours', share_until: new Date(Date.now() + 3 * 3600_000).toISOString() }
      : { share_scope: scope, share_until: null }
    try { await loc.updateMine(patch); setShare(false); toast(scope === 'off' ? 'Location sharing off' : 'Sharing updated', 'ok') }
    catch (err) { toast(friendly(err, 'Couldn’t update sharing. Try again.')) }
  }

  const scope = loc.mine?.share_scope || 'plan'
  const sharePill = ghost ? '👻 You are hidden from the crew'
    : live.broadcasting ? (scope === 'always' ? '📡 Live · sharing always' : scope === 'hours' ? `📡 Live until ${fmtTime(loc.mine.share_until)}` : '📡 Live · tied to the current plan')
    : scope === 'off' ? '⏹ Sharing off'
    : scope === 'plan' ? (planActive ? '📡 Sharing during plans · not broadcasting' : '📡 Sharing during plans · none on now')
    : scope === 'hours' ? (loc.mine?.share_until && new Date(loc.mine.share_until) > new Date() ? `📡 Sharing until ${fmtTime(loc.mine.share_until)}` : '⏹ 3 hours are up')
    : '📡 Sharing always · not broadcasting'

  return (
    <div className="app now">
      <Rail items={navItems(nav)} active="now" />
      <main className="main">
        <div className="top">
          <a className="word" onClick={() => nav('/now')}>LINK<b>UP</b></a>
          <div className="seg">
            <button className="on">NOW</button>
            <button onClick={() => nav('/trips')}>TRIPS</button>
          </div>
          <div className="spacer"></div>
          <Stack people={members} max={4} onClick={() => setCrewMenu(true)} />
          <button className={`btn ghost-btn ${ghost ? 'active' : ''}`} disabled={loc.saving} onClick={toggleGhost}>{ghost ? '👻 Ghost on' : '👻 Ghost mode'}</button>
          <button className="btn primary" onClick={() => setDrop(true)}>＋ Drop a plan</button>
        </div>

        <div className={`ghostbar ${ghost ? 'show' : ''}`}>
          <span className="g">👻</span>
          <div>You're invisible. Only you can see where you are — nobody in the crew can track you until you turn this off.</div>
        </div>

        <GeoBar live={live} mine={loc.mine} planActive={planActive} onPrime={() => setPrimer(true)} onScope={() => setShare(true)} />

        <div className="maprow">
          <LiveMap crew={activeCrew} mine={loc.mine} others={loc.others} members={members} loading={loc.loading} error={loc.error} onReload={loc.reload}
            ghost={ghost} sharePill={sharePill} onShareClick={() => setShare(true)} live={live} now={now} full={fullMap} onToggleFull={() => setFullMap((f) => !f)} />
        </div>

        <div className="cols">
          <Plans data={plans} members={members} userId={user.id} onDrop={() => setDrop(true)} />
          <Feed items={feed} loading={plans.loading || loc.loading} error={plans.error || loc.error} onReload={() => { plans.reload(); loc.reload() }} />
        </div>
      </main>

      {drop && <PlanModal onClose={() => setDrop(false)} onCreated={plans.reload} />}
      {crewMenu && <CrewMenu onClose={() => setCrewMenu(false)} />}
      {share && <ScopeModal mine={loc.mine} planActive={planActive} saving={loc.saving} crewName={activeCrew.name} onPick={setScope} onClose={() => setShare(false)} />}
      {primer && <PrimerModal crewName={activeCrew.name} onClose={() => setPrimer(false)} onEnable={() => { setPrimer(false); live.enable() }} />}
    </div>
  )
}
