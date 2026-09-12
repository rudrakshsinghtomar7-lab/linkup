import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Rail from '../components/Rail'
import { Icon } from '../components/Icons'
import { Stack } from '../components/Avatar'
import CrewMenu from '../components/CrewMenu'
import PlanModal from '../components/PlanModal'
import Modal from '../components/Modal'
import LiveMap from './now/LiveMap'
import Plans from './now/Plans'
import Feed from './now/Feed'
import { useSession } from '../providers/SessionProvider'
import { useToast } from '../providers/ToastProvider'
import { usePlans } from '../hooks/usePlans'
import { useLocations } from '../hooks/useLocations'
import { useActivity } from '../hooks/useActivity'
import { friendly, fmtTime } from '../lib/format'
import '../styles/now.css'

const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

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
  const [active, setActive] = useState('now')

  const ghost = !!loc.mine?.ghost

  // Ghost mode: locations.ghost on my own row. RLS decides who sees what; we only mirror our own state.
  async function toggleGhost() {
    try { await loc.updateMine({ ghost: !ghost }); toast(ghost ? 'You’re visible to the crew again' : 'Ghost mode on — you’re hidden', 'ok') }
    catch (err) { toast(friendly(err, 'Couldn’t change ghost mode. Try again.')) }
  }

  async function setScope(scope) {
    try { await loc.updateMine({ share_scope: scope }); setShare(false) }
    catch (err) { toast(friendly(err, 'Couldn’t update sharing. Try again.')) }
  }

  const sharePill = ghost ? '👻 You are hidden from the crew'
    : !loc.mine ? '📡 Not sharing yet · tap to choose'
    : loc.mine.share_scope === 'always' ? '📡 Sharing always'
    : loc.mine.share_until ? `📡 Sharing until ${fmtTime(loc.mine.share_until)} · tied to tonight's plan`
    : '📡 Sharing only while a plan is on'

  const rail = [
    { key: 'now', tip: 'Now', icon: Icon.clock, onClick: () => { setActive('now'); window.scrollTo({ top: 0, behavior: 'smooth' }) } },
    { key: 'map', tip: 'Map', icon: Icon.map, onClick: () => { setActive('map'); scrollTo('map') } },
    { key: 'trips', tip: 'Trips', icon: Icon.pin, onClick: () => nav('/trips') },
    { key: 'plans', tip: 'Plans', icon: Icon.calendar, onClick: () => { setActive('plans'); scrollTo('plans') } },
    { key: 'money', tip: 'Money', icon: Icon.money, onClick: () => nav('/trips#money') },
  ]

  return (
    <div className="app now">
      <Rail items={rail} active={active} />
      <main className="main">
        <div className="top">
          <a className="word" onClick={() => nav('/now')}>LINK<b>UP</b></a>
          <div className="seg">
            <button className="on">NOW</button>
            <button onClick={() => nav('/trips')}>TRIPS</button>
          </div>
          <div className="spacer"></div>
          <Stack people={members.filter((m) => m.id !== user.id)} max={3} onClick={() => setCrewMenu(true)} />
          <button className={`btn ghost-btn ${ghost ? 'active' : ''}`} disabled={loc.saving} onClick={toggleGhost}>{ghost ? '👻 Ghost on' : '👻 Ghost mode'}</button>
          <button className="btn primary" onClick={() => setDrop(true)}>＋ Drop a plan</button>
        </div>

        <div className={`ghostbar ${ghost ? 'show' : ''}`}>
          <span className="g">👻</span>
          <div>You're invisible. Only you can see where you are — nobody in the crew can track you until you turn this off.</div>
        </div>

        <div className="maprow">
          <LiveMap crew={activeCrew} mine={loc.mine} others={loc.others} members={members} loading={loc.loading} error={loc.error} onReload={loc.reload}
            ghost={ghost} sharePill={sharePill} onShareClick={() => setShare(true)} />
        </div>

        <div className="cols">
          <Plans data={plans} members={members} userId={user.id} onDrop={() => setDrop(true)} />
          <Feed items={feed} loading={plans.loading || loc.loading} error={plans.error || loc.error} onReload={() => { plans.reload(); loc.reload() }} />
        </div>
      </main>

      {drop && <PlanModal onClose={() => setDrop(false)} onCreated={plans.reload} />}
      {crewMenu && <CrewMenu onClose={() => setCrewMenu(false)} />}
      {share && (
        <Modal title="Location sharing" icon={<Icon.map />} onClose={() => setShare(false)}>
          <p className="state" style={{ paddingTop: 0 }}>Live GPS lands in the next phase. Choose now when your location will be shared with {activeCrew.name}.</p>
          <button className="btn ghost" style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 8 }} disabled={loc.saving} onClick={() => setScope('plan')}>
            📡 Only while a plan I’m in is on {loc.mine?.share_scope !== 'always' && loc.mine ? '· current' : ''}
          </button>
          <button className="btn ghost" style={{ width: '100%', justifyContent: 'flex-start' }} disabled={loc.saving} onClick={() => setScope('always')}>
            🌐 Always {loc.mine?.share_scope === 'always' ? '· current' : ''}
          </button>
        </Modal>
      )}
    </div>
  )
}
