import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from './useRealtime'

// Plans whose start falls on a given local day (YYYY-MM-DD), with RSVPs. Expired ones included —
// the planner is a calendar, not a feed.
export function useDayPlans(crewId, day, userId) {
  const [plans, setPlans] = useState(null)
  const [rsvps, setRsvps] = useState([])
  const [error, setError] = useState(null)
  const [pending, setPending] = useState({})

  const load = useCallback(async () => {
    if (!crewId || !day) return
    setError(null)
    const start = new Date(day + 'T00:00:00'); const end = new Date(start.getTime() + 86400e3)
    const { data: p, error: pe } = await supabase.from('plans')
      .select('*, profiles!plans_created_by_fkey(display_name, color)')
      .eq('crew_id', crewId).gte('starts_at', start.toISOString()).lt('starts_at', end.toISOString()).order('starts_at')
    if (pe) { setError(pe); setPlans([]); return }
    const ids = (p || []).map((x) => x.id)
    const { data: r, error: re } = ids.length ? await supabase.from('plan_rsvps').select('plan_id, user_id, status, updated_at, profiles(display_name, color)').in('plan_id', ids) : { data: [] }
    if (re) { setError(re); return }
    setPlans(p || []); setRsvps(r || [])
  }, [crewId, day])
  useEffect(() => { load() }, [load])
  useRealtime('plans', `crew_id=eq.${crewId}`, load, !!crewId)
  useRealtime('plan_rsvps', null, load, !!crewId)

  const rsvp = useCallback(async (planId, status) => {
    setPending((s) => ({ ...s, [planId]: true }))
    try {
      const { error } = await supabase.from('plan_rsvps').upsert({ plan_id: planId, user_id: userId, status, updated_at: new Date().toISOString() }, { onConflict: 'plan_id,user_id' })
      if (error) throw error
      await load()
    } finally { setPending((s) => ({ ...s, [planId]: false })) }
  }, [userId, load])

  return { plans, rsvps, loading: plans === null, error, reload: load, rsvp, pending }
}
