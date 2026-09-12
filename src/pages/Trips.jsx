import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Rail from '../components/Rail'
import { Icon } from '../components/Icons'
import { Stack } from '../components/Avatar'
import CrewMenu from '../components/CrewMenu'
import PlanModal from '../components/PlanModal'
import Hero from './trips/Hero'
import TripModal from './trips/TripModal'
import Places, { Poll } from './trips/Places'
import PhotoWall from './trips/PhotoWall'
import Availability from './trips/Availability'
import Expenses from './trips/Expenses'
import { useSession } from '../providers/SessionProvider'
import { useToast } from '../providers/ToastProvider'
import { useTrips } from '../hooks/useTrips'
import { usePlaces } from '../hooks/usePlaces'
import { usePhotos } from '../hooks/usePhotos'
import { useAvailability } from '../hooks/useAvailability'
import { useExpenses } from '../hooks/useExpenses'
import '../styles/trips.css'

const scrollTo = (id) => () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

export default function Trips() {
  const { activeCrew, members, user } = useSession()
  const toast = useToast()
  const nav = useNavigate()
  const trips = useTrips(activeCrew.id)
  const trip = trips.active
  const places = usePlaces(trip?.id, user.id)
  const photos = usePhotos(trip?.id, user.id)
  const avail = useAvailability(trip, user.id)
  const expenses = useExpenses(activeCrew.id, user.id)
  const [switching, setSwitching] = useState(false)
  const [newTrip, setNewTrip] = useState(false)
  const [newPlan, setNewPlan] = useState(false)
  const [crewMenu, setCrewMenu] = useState(false)
  const [active, setActive] = useState('dashboard')

  useEffect(() => { if (trips.error) toast('Couldn’t load trips. Pull to refresh or try again.') }, [trips.error]) // eslint-disable-line react-hooks/exhaustive-deps

  const rail = [
    { key: 'dashboard', tip: 'Dashboard', icon: Icon.dashboard, onClick: () => { setActive('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }) } },
    { key: 'places', tip: 'Places', icon: Icon.pin, onClick: () => { setActive('places'); scrollTo('places')() } },
    { key: 'voting', tip: 'Voting', icon: Icon.bars, onClick: () => { setActive('voting'); scrollTo('voting')() } },
    { key: 'photos', tip: 'Photos', icon: Icon.photo, onClick: () => { setActive('photos'); scrollTo('photos')() } },
    { key: 'calendar', tip: 'Calendar', icon: Icon.calendar, onClick: () => { setActive('calendar'); scrollTo('calendar')() } },
    { key: 'money', tip: 'Money', icon: Icon.money, onClick: () => { setActive('money'); scrollTo('money')() } },
  ]

  return (
    <div className="app trips">
      <Rail items={rail} active={active} />
      <main className="main">
        <div className="top">
          <a className="word" onClick={() => nav('/now')}>LINK<b>UP</b></a>
          <div className="switch" onClick={() => setSwitching((s) => !s)} role="button" aria-haspopup="menu">
            <span className={`dot ${trip ? '' : 'off'}`}></span>
            <div><small>Active trip</small><strong>{trips.trips === null ? 'Loading…' : trip ? trip.title : 'No trip yet'}</strong></div>
            <span className="chev">▾</span>
            {switching && (
              <div className="switch-menu" role="menu" onClick={(e) => e.stopPropagation()}>
                {(trips.trips || []).map((t) => <button key={t.id} className={t.id === trip?.id ? 'on' : ''} onClick={() => { trips.select(t.id); setSwitching(false) }}>{t.title}</button>)}
                {(trips.trips || []).length === 0 && <div className="state">No trips in {activeCrew.name} yet.</div>}
                <button className="new" onClick={() => { setSwitching(false); setNewTrip(true) }}>＋ New trip</button>
              </div>
            )}
          </div>
          <div className="spacer"></div>
          <Stack people={members} onClick={() => setCrewMenu(true)} />
          <button className="btn ghost" onClick={() => setCrewMenu(true)}>＋ Invite</button>
          <button className="btn primary" onClick={() => setNewPlan(true)}>＋ New plan</button>
        </div>

        <Hero trip={trip} going={members.length} onNewTrip={() => setNewTrip(true)} />

        <div className="grid">
          <Places trip={trip} data={places} />
          <Poll trip={trip} data={places} />
          <PhotoWall trip={trip} data={photos} />
          <Availability trip={trip} members={members} userId={user.id} data={avail} onEditTrip={() => setNewTrip(true)} />
          <Expenses trip={trip} members={members} userId={user.id} data={expenses} />
        </div>
      </main>

      {newTrip && <TripModal onClose={() => setNewTrip(false)} onCreate={(f) => trips.create(f, user.id)} />}
      {newPlan && <PlanModal onClose={() => setNewPlan(false)} onCreated={() => nav('/now')} />}
      {crewMenu && <CrewMenu onClose={() => setCrewMenu(false)} />}
    </div>
  )
}
