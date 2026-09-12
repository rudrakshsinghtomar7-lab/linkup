import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Rail from './Rail'
import { navItems } from './nav'

// Persistent frame: the rail / tab bar lives here so it stays mounted across routes
// (the sliding pill only animates if the bar survives navigation).
export default function Shell() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const active = pathname.startsWith('/now') ? 'now' : pathname.endsWith('/day') ? 'day' : pathname.endsWith('/photos') ? 'photos' : 'trip'
  return (
    <div className={`app ${active === 'now' ? 'now' : 'trips'}`}>
      <Rail items={navItems(nav)} active={active} />
      <Outlet />
    </div>
  )
}
