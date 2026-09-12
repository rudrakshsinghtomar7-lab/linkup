import { Icon } from './Icons'

// App-wide navigation (desktop rail + mobile tab bar share it).
export const NAV = [
  { key: 'now', tip: 'Now', icon: Icon.clock, to: '/now' },
  { key: 'trip', tip: 'Trip', icon: Icon.pin, to: '/trips' },
  { key: 'day', tip: 'Day', icon: Icon.calendar, to: '/trips/day' },
  { key: 'photos', tip: 'Photos', icon: Icon.photo, to: '/trips/photos' },
]

export const navItems = (navigate) => NAV.map((n) => ({ ...n, onClick: () => navigate(n.to) }))
