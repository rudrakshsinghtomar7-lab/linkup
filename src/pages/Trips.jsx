import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Stack } from '../components/Avatar'
import CrewMenu from '../components/CrewMenu'
import PlanModal from '../components/PlanModal'
import Hero from './trips/Hero'
import TripModal from './trips/TripModal'
import Places, { Poll } from './trips/Places'
import Availability from './trips/Availability'
import Expenses from './trips/Expenses'
import DayPlanner from './trips/DayPlanner'
import Albums from './trips/Albums'
import { useSession } from '../providers/SessionProvider'
import { useToast } from '../providers/ToastProvider'
import { useTrips } from '../hooks/useTrips'
import { usePlaces } from '../hooks/usePlaces'
import { useAvailability } from '../hooks/useAvailability'
import { useExpenses } from '../hooks/useExpenses'
import '../styles/trips.css'

// The big multi-day trip: hero, places + poll, who's free, money.
function TripSegment({ trips, trip, members, user, onNewTrip, onSwitch }) {
  const places = usePlaces(trip?.id, user.id)
  const avail = useAvailability(trip, user.id)
  const { activeCrew, reloadMembers } = useSession()
  const expenses = useExpenses(activeCrew.id, user.id)
  const [switching, setSwitching] = useState(false)
  useEffect(() => {
    const known = new Set(members.map((m) => m.id))
    const seen = [...(avail.rows || []).map((r) => r.user_id), ...(expenses.balances || []).map((b) => b.user_id)]
    if (seen.some((id) => !known.has(id))) reloadMembers()
  }, [avail.rows, expenses.balances]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <div className="switch" style={{ display: 'inline-flex', marginBottom: 18 }} onClick={() => setSwitching((s) => !s)} role="button" aria-haspopup="menu">
        <span className={`dot ${trip ? '' : 'off'}`}></span>
        <div><small>Active trip</small><strong>{trips.trips === null ? 'Loading…' : trip ? trip.title : 'No trip yet'}</strong></div>
        <span className="chev">▾</span>
        {switching && (
          <div className="switch-menu" role="menu" onClick={(e) => e.stopPropagation()}>
            {(trips.trips || []).map((t) => <button key={t.id} className={t.id === trip?.id ? 'on' : ''} onClick={() => { onSwitch(t.id); setSwitching(false) }}>{t.title}</button>)}
            {(trips.trips || []).length === 0 && <div className="state">No trips in {activeCrew.name} yet.</div>}
            <button className="new" onClick={() => { setSwitching(false); onNewTrip() }}>＋ New trip</button>
          </div>
        )}
      </div>
      <Hero trip={trip} loading={trips.trips === null} going={members.length} onNewTrip={onNewTrip} />
      <div className="grid">
        <Places trip={trip} data={places} />
        <Poll trip={trip} data={places} />
        <Availability trip={trip} members={members} userId={user.id} data={avail} onEditTrip={onNewTrip} />
        <Expenses trip={trip} members={members} userId={user.id} data={expenses} />
      </div>
    </>
  )
}

export default function Trips() {
  const { activeCrew, members, user } = useSession()
  const toast = useToast()
  const nav = useNavigate()
  const { pathname } = useLocation()
  const seg = pathname.endsWith('/day') ? 'day' : pathname.endsWith('/photos') ? 'photos' : 'trip'
  const trips = useTrips(activeCrew.id)
  const trip = trips.active
  const [newTrip, setNewTrip] = useState(false)
  const [newPlan, setNewPlan] = useState(null) // null | { day }
  const [crewMenu, setCrewMenu] = useState(false)

  useEffect(() => { if (trips.error) toast('Couldn’t load trips. Try again.') }, [trips.error]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <main className="main">
        <div className="top">
          <a className="word" onClick={() => nav('/now')}>LINK<b>UP</b></a>
          <div className="seg">
            <button className={seg === 'trip' ? 'on' : ''} onClick={() => nav('/trips')}>TRIP</button>
            <button className={seg === 'day' ? 'on' : ''} onClick={() => nav('/trips/day')}>DAY</button>
            <button className={seg === 'photos' ? 'on' : ''} onClick={() => nav('/trips/photos')}>PHOTOS</button>
          </div>
          <div className="spacer"></div>
          <Stack people={members} onClick={() => setCrewMenu(true)} />
          <button className="btn ghost" onClick={() => setCrewMenu(true)}>＋ Invite</button>
          <button className="btn primary" onClick={() => setNewPlan({})}>＋ New plan</button>
        </div>

        {seg === 'trip' && <TripSegment trips={trips} trip={trip} members={members} user={user} onNewTrip={() => setNewTrip(true)} onSwitch={trips.select} />}
        {seg === 'day' && <div className="segwrap"><DayPlanner crewId={activeCrew.id} members={members} userId={user.id} onPlan={(day) => setNewPlan({ day })} /></div>}
        {seg === 'photos' && <Albums crewId={activeCrew.id} userId={user.id} />}
      </main>

      {newTrip && <TripModal onClose={() => setNewTrip(false)} onCreate={(f) => trips.create(f, user.id)} />}
      {newPlan && <PlanModal day={newPlan.day} onClose={() => setNewPlan(null)} onCreated={() => { if (seg !== 'day') nav('/trips/day') }} />}
      {crewMenu && <CrewMenu onClose={() => setCrewMenu(false)} />}
    </>
  )
}
