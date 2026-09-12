import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from './useRealtime'

const DAY = 86400e3

// Active plans (not yet expired) plus anything that expired in the last 24h, with all RSVPs.
export function usePlans(crewId, userId) {
  const [plans, setPlans] = useState(null)
  const [rsvps, setRsvps] = useState([])
  const [error, setError] = useState(null)
  const [pending, setPending] = useState({})

  const load = useCallback(async () => {
    if (!crewId) return
    setError(null)
    const since = new Date(Date.now() - DAY).toISOString()
    const { data: p, error: pe } = await supabase.from('plans')
      .select('*, profiles!plans_created_by_fkey(display_name, color)')
      .eq('crew_id', crewId).gt('expires_at', since).order('starts_at', { ascending: true, nullsFirst: false })
    if (pe) { setError(pe); setPlans([]); return }
    const ids = (p || []).map((x) => x.id)
    const { data: r, error: re } = ids.length ? await supabase.from('plan_rsvps').select('plan_id, user_id, status, updated_at, profiles(display_name, color, avatar_url)').in('plan_id', ids) : { data: [] }
    if (re) { setError(re); return }
    setPlans(p || []); setRsvps(r || [])
  }, [crewId])
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
