import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// Foreground-only live location (web can't do background). One watchPosition watcher,
// writes to my own locations row at most every 30s AND only after moving ≥25m, and only
// while the share scope + ghost state permit. The watcher itself runs whenever we're
// allowed to *see* ourselves (scope ≠ off, or ghosting) so the "you" chevron stays live.

const WRITE_INTERVAL = 30_000
const MIN_MOVE_M = 25
const PRIMED_KEY = 'linkup.geo.primed'

export function distanceM(a, b) {
  const R = 6371000, toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// Does the current scope allow broadcasting right now?
export function scopeAllows(mine, planActive, now = Date.now()) {
  const scope = mine?.share_scope || 'plan'
  if (scope === 'off') return false
  if (scope === 'always') return true
  if (scope === 'hours') return !!mine?.share_until && new Date(mine.share_until).getTime() > now
  return planActive // 'plan'
}

export function useLiveLocation({ crewId, userId, mine, planActive, precise = false, onWrote }) {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator
  const [permission, setPermission] = useState(supported ? 'unknown' : 'unsupported') // unknown|prompt|granted|denied|unsupported
  const [primed, setPrimed] = useState(() => { try { return localStorage.getItem(PRIMED_KEY) === '1' } catch { return false } })
  const [position, setPosition] = useState(null) // { lat, lng, heading, accuracy, at }
  const [geoError, setGeoError] = useState(null)
  const [visible, setVisible] = useState(document.visibilityState !== 'hidden')
  const [lastWrite, setLastWrite] = useState(null)
  const watcher = useRef(null)
  const last = useRef({ at: 0, lat: null, lng: null })
  const mineRef = useRef(mine); mineRef.current = mine
  const gate = useRef(false)
  const pendingTimer = useRef(null)
  const latest = useRef(null)

  // Track the OS-level permission where the browser exposes it (Safari doesn't).
  useEffect(() => {
    if (!supported || !navigator.permissions?.query) return
    let status
    navigator.permissions.query({ name: 'geolocation' }).then((s) => {
      status = s; setPermission(s.state)
      s.onchange = () => setPermission(s.state)
    }).catch(() => {})
    return () => { if (status) status.onchange = null }
  }, [supported])

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const ghost = !!mine?.ghost
  const scope = mine?.share_scope || 'plan'
  const broadcasting = !ghost && scopeAllows(mine, planActive) && permission === 'granted' && visible
  gate.current = broadcasting
  // Watch whenever we may show ourselves: any scope but off (ghosting users still see themselves).
  const wantWatch = supported && primed && visible && permission !== 'denied' && (scope !== 'off' || ghost)

  const write = useCallback(async (p, force = false) => {
    latest.current = p
    if (!gate.current && !force) return
    const now = Date.now()
    const moved = last.current.lat == null ? Infinity : distanceM(last.current, p)
    if (!force && moved < MIN_MOVE_M && last.current.lat != null) return
    const wait = WRITE_INTERVAL - (now - last.current.at)
    if (!force && wait > 0) {
      // Inside the 30s window: defer, and send the *latest* fix when the window ends.
      clearTimeout(pendingTimer.current)
      pendingTimer.current = setTimeout(() => { if (latest.current) write(latest.current) }, wait + 50)
      return
    }
    clearTimeout(pendingTimer.current)
    const { error } = await supabase.from('locations')
      .upsert({ user_id: userId, crew_id: crewId, lat: p.lat, lng: p.lng, updated_at: new Date().toISOString() }, { onConflict: 'user_id,crew_id' })
    if (error) { console.error(error); return }
    last.current = { at: now, lat: p.lat, lng: p.lng }
    setLastWrite(now)
    onWrote?.()
  }, [userId, crewId, onWrote])
  useEffect(() => () => clearTimeout(pendingTimer.current), [])

  // Start/stop the single watcher.
  useEffect(() => {
    if (!wantWatch) {
      if (watcher.current != null) { navigator.geolocation.clearWatch(watcher.current); watcher.current = null }
      return
    }
    if (watcher.current != null) return
    watcher.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, heading: Number.isFinite(pos.coords.heading) ? pos.coords.heading : null, accuracy: pos.coords.accuracy, at: Date.now() }
        setPermission('granted'); setGeoError(null); setPosition(p)
        write(p)
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) { setPermission('denied'); setGeoError('denied') }
        else if (err.code === err.POSITION_UNAVAILABLE) setGeoError('unavailable')
        else setGeoError('timeout')
      },
      { enableHighAccuracy: precise, maximumAge: 15_000, timeout: 20_000 },
    )
    return () => { if (watcher.current != null) { navigator.geolocation.clearWatch(watcher.current); watcher.current = null } }
  }, [wantWatch, precise, write])

  // When broadcasting turns on (scope/plan/ghost change) push the current fix straight away.
  const wasBroadcasting = useRef(false)
  useEffect(() => {
    if (broadcasting && !wasBroadcasting.current && position) write(position, true)
    if (!broadcasting) last.current.at = 0 // next allowed write goes out immediately
    wasBroadcasting.current = broadcasting
  }, [broadcasting]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-expire "for N hours": once share_until passes, revert to off on the row.
  useEffect(() => {
    if (!mine || mine.share_scope !== 'hours' || !mine.share_until) return
    const ms = new Date(mine.share_until).getTime() - Date.now()
    const expire = async () => {
      const { error } = await supabase.from('locations').update({ share_scope: 'off', share_until: null, updated_at: new Date().toISOString() })
        .eq('user_id', userId).eq('crew_id', crewId)
      if (error) console.error(error)
    }
    if (ms <= 0) { expire(); return }
    const id = setTimeout(expire, Math.min(ms, 2 ** 31 - 1))
    return () => clearTimeout(id)
  }, [mine?.share_scope, mine?.share_until, userId, crewId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Explicit user tap → OS prompt. Marks the primer as seen.
  const enable = useCallback(() => {
    try { localStorage.setItem(PRIMED_KEY, '1') } catch { /* private mode */ }
    setPrimed(true); setGeoError(null)
    if (!supported) return
    navigator.geolocation.getCurrentPosition(
      () => setPermission('granted'),
      (err) => { if (err.code === err.PERMISSION_DENIED) { setPermission('denied'); setGeoError('denied') } else setGeoError(err.code === err.POSITION_UNAVAILABLE ? 'unavailable' : 'timeout') },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 20_000 },
    )
  }, [supported])

  return { supported, permission, primed, position, geoError, broadcasting, visible, lastWrite, enable }
}
