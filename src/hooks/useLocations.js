import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from './useRealtime'

// Crew locations for the map. RLS already hides ghosted members from everyone but themselves,
// so `others` is exactly what this user is allowed to see. `mine` is my own row (may not exist yet).
export function useLocations(crewId, userId) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!crewId) return
    setError(null)
    const { data, error } = await supabase.from('locations')
      .select('user_id, crew_id, lat, lng, status, ghost, share_scope, share_until, updated_at')
      .eq('crew_id', crewId)
    if (error) { setError(error); setRows([]); return }
    setRows(data || [])
  }, [crewId])
  useEffect(() => { load() }, [load])
  useRealtime('locations', `crew_id=eq.${crewId}`, load, !!crewId)

  const mine = rows?.find((r) => r.user_id === userId) ?? null
  const others = (rows || []).filter((r) => r.user_id !== userId)

  // Upsert my own row (PK user_id+crew_id). Only touches the columns passed.
  const updateMine = useCallback(async (patch) => {
    setSaving(true)
    try {
      const { error } = await supabase.from('locations')
        .upsert({ user_id: userId, crew_id: crewId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'user_id,crew_id' })
      if (error) throw error
      await load()
    } finally { setSaving(false) }
  }, [userId, crewId, load])

  return { rows, mine, others, loading: rows === null, error, reload: load, updateMine, saving }
}
