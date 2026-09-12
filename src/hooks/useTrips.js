import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const key = (crewId) => `linkup.trip.${crewId}`

// Trips for the active crew + which one is "active" (remembered per crew on this device).
export function useTrips(crewId) {
  const [trips, setTrips] = useState(null)
  const [error, setError] = useState(null)
  const [activeId, setActiveId] = useState(() => { try { return localStorage.getItem(key(crewId)) } catch { return null } })

  const load = useCallback(async () => {
    if (!crewId) return
    setError(null)
    const { data, error } = await supabase.from('trips').select('*').eq('crew_id', crewId).order('start_date', { ascending: true, nullsFirst: false })
    if (error) { setError(error); setTrips([]); return }
    setTrips(data || [])
  }, [crewId])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!trips) return
    const ok = trips.some((t) => t.id === activeId)
    if (ok) return
    // Prefer the next upcoming trip, else the most recent one.
    const today = new Date().toISOString().slice(0, 10)
    const next = trips.find((t) => !t.end_date || t.end_date >= today) || trips[trips.length - 1]
    setActiveId(next?.id ?? null)
  }, [trips, activeId])

  const select = useCallback((id) => {
    setActiveId(id)
    try { localStorage.setItem(key(crewId), id) } catch { /* private mode */ }
  }, [crewId])

  const create = useCallback(async (fields, userId) => {
    const { data, error } = await supabase.from('trips').insert({ ...fields, crew_id: crewId, created_by: userId }).select().single()
    if (error) throw error
    await load()
    select(data.id)
    return data
  }, [crewId, load, select])

  return { trips, error, reload: load, active: trips?.find((t) => t.id === activeId) ?? null, select, create }
}
