import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

function dayList(start, end) {
  if (!start) return []
  const out = []
  const d = new Date(start + 'T00:00:00')
  const last = new Date((end || start) + 'T00:00:00')
  while (d <= last && out.length < 31) { out.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1) }
  return out
}

// Availability grid: rows = crew members, columns = trip days. Missing row = busy.
export function useAvailability(trip, userId) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState({})
  const tripId = trip?.id

  const load = useCallback(async () => {
    if (!tripId) { setRows([]); return }
    setError(null)
    const { data, error } = await supabase.from('availability').select('user_id, day, is_free').eq('trip_id', tripId)
    if (error) { setError(error); setRows([]); return }
    setRows(data || [])
  }, [tripId])
  useEffect(() => { load() }, [load])

  const days = useMemo(() => dayList(trip?.start_date, trip?.end_date), [trip?.start_date, trip?.end_date])

  const isFree = useCallback((uid, day) => !!rows?.find((r) => r.user_id === uid && r.day === day)?.is_free, [rows])

  const toggle = useCallback(async (day) => {
    const k = `${userId}:${day}`
    const next = !isFree(userId, day)
    setPending((s) => ({ ...s, [k]: true }))
    try {
      const { error } = await supabase.from('availability').upsert({ trip_id: tripId, user_id: userId, day, is_free: next }, { onConflict: 'trip_id,user_id,day' })
      if (error) throw error
      await load()
    } finally { setPending((s) => ({ ...s, [k]: false })) }
  }, [tripId, userId, isFree, load])

  return { days, rows, loading: rows === null, error, reload: load, isFree, toggle, pending }
}
