import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from './useRealtime'

// Places for a trip plus every vote on them. Vote counts are derived from place_votes rows.
export function usePlaces(tripId, userId) {
  const [places, setPlaces] = useState(null)
  const [votes, setVotes] = useState([])
  const [error, setError] = useState(null)
  const [pending, setPending] = useState({})

  const load = useCallback(async () => {
    if (!tripId) { setPlaces([]); setVotes([]); return }
    setError(null)
    const { data: p, error: pe } = await supabase.from('trip_places').select('*').eq('trip_id', tripId).order('created_at', { ascending: true })
    if (pe) { setError(pe); setPlaces([]); return }
    const ids = (p || []).map((x) => x.id)
    const { data: v, error: ve } = ids.length ? await supabase.from('place_votes').select('place_id, user_id, profiles(display_name, color)').in('place_id', ids) : { data: [] }
    if (ve) { setError(ve); return }
    setPlaces(p || []); setVotes(v || [])
  }, [tripId])
  useEffect(() => { load() }, [load])

  // place_votes has no trip column, so listen broadly (RLS scopes it) and refetch.
  useRealtime('place_votes', null, load, !!tripId)
  useRealtime('trip_places', `trip_id=eq.${tripId}`, load, !!tripId)

  const withCounts = useMemo(() => (places || []).map((p) => ({
    ...p,
    votes: votes.filter((v) => v.place_id === p.id).length,
    mine: votes.some((v) => v.place_id === p.id && v.user_id === userId),
  })), [places, votes, userId])

  const toggleVote = useCallback(async (place) => {
    setPending((s) => ({ ...s, [place.id]: true }))
    try {
      const q = place.mine
        ? supabase.from('place_votes').delete().eq('place_id', place.id).eq('user_id', userId)
        : supabase.from('place_votes').insert({ place_id: place.id, user_id: userId })
      const { error } = await q
      if (error && error.code !== '23505') throw error // 23505 = already voted (duplicate) — treat as done
      await load()
    } finally { setPending((s) => ({ ...s, [place.id]: false })) }
  }, [userId, load])

  const addPlace = useCallback(async (fields) => {
    const { error } = await supabase.from('trip_places').insert({ ...fields, trip_id: tripId, added_by: userId })
    if (error) throw error
    await load()
  }, [tripId, userId, load])

  return { places: withCounts, loading: places === null, error, reload: load, toggleVote, pending, addPlace }
}
