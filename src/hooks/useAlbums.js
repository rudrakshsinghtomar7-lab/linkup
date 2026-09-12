import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from './useRealtime'

const BUCKET = 'trip-photos'

// One album per trip and per plan in the crew, created implicitly with the trip/plan.
export function useAlbums(crewId) {
  const [albums, setAlbums] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!crewId) return
    setError(null)
    const [t, p] = await Promise.all([
      supabase.from('trips').select('id, title, destination, start_date, end_date, created_at').eq('crew_id', crewId),
      supabase.from('plans').select('id, title, emoji, place_name, location, starts_at, created_at').eq('crew_id', crewId),
    ])
    if (t.error || p.error) { setError(t.error || p.error); setAlbums([]); return }
    const ids = [...(t.data || []).map((x) => x.id), ...(p.data || []).map((x) => x.id)]
    const { data: photos, error: fe } = ids.length
      ? await supabase.from('trip_photos').select('id, trip_id, plan_id, storage_path, width, height, created_at').or(`trip_id.in.(${(t.data || []).map((x) => x.id).join(',') || 'null'}),plan_id.in.(${(p.data || []).map((x) => x.id).join(',') || 'null'})`).order('created_at', { ascending: false })
      : { data: [] }
    if (fe) { setError(fe); setAlbums([]); return }
    const byAlbum = {}
    for (const ph of photos || []) { const k = ph.trip_id || ph.plan_id; (byAlbum[k] ||= []).push(ph) }
    // Sign the first three of each album for covers.
    const coverPaths = Object.values(byAlbum).flatMap((l) => l.slice(0, 3).map((x) => x.storage_path))
    const signed = coverPaths.length ? (await supabase.storage.from(BUCKET).createSignedUrls(coverPaths, 3600)).data || [] : []
    const urlFor = Object.fromEntries(signed.map((s, i) => [coverPaths[i], s.signedUrl]))
    const list = [
      ...(t.data || []).map((x) => ({ kind: 'trip', id: x.id, title: x.title, sub: x.destination || 'Trip', date: x.start_date || x.created_at.slice(0, 10), emoji: '🧳' })),
      ...(p.data || []).map((x) => ({ kind: 'plan', id: x.id, title: x.title, sub: [x.place_name, x.location].filter(Boolean).join(' · ') || 'Plan', date: (x.starts_at || x.created_at).slice(0, 10), emoji: x.emoji || '📍' })),
    ].map((a) => ({ ...a, count: (byAlbum[a.id] || []).length, covers: (byAlbum[a.id] || []).slice(0, 3).map((ph) => urlFor[ph.storage_path]).filter(Boolean) }))
    list.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0))
    setAlbums(list)
  }, [crewId])
  useEffect(() => { load() }, [load])
  useRealtime('plans', `crew_id=eq.${crewId}`, load, !!crewId)
  useRealtime('trips', `crew_id=eq.${crewId}`, load, !!crewId)

  return { albums, loading: albums === null, error, reload: load }
}
