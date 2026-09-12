import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Subscribe to postgres_changes on one table and call `onChange(payload)` for every event.
// RLS filters what this client is allowed to receive; callers refetch rather than patch.
export function useRealtime(table, filter, onChange, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const name = `${table}:${filter || 'all'}:${Math.random().toString(36).slice(2, 8)}`
    const spec = { event: '*', schema: 'public', table }
    if (filter) spec.filter = filter
    const ch = supabase.channel(name).on('postgres_changes', spec, (p) => onChange?.(p)).subscribe()
    return () => { supabase.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter, enabled])
}
