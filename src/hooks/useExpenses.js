import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Balances come from the crew_balances view (authoritative); recent rows from expenses.
export function useExpenses(crewId, userId) {
  const [balances, setBalances] = useState(null)
  const [recent, setRecent] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!crewId) return
    setError(null)
    const [b, r] = await Promise.all([
      supabase.from('crew_balances').select('user_id, balance').eq('crew_id', crewId),
      supabase.from('expenses').select('id, title, amount, created_at, paid_by, trip_id, profiles(display_name), expense_shares(count)')
        .eq('crew_id', crewId).order('created_at', { ascending: false }).limit(5),
    ])
    if (b.error || r.error) { setError(b.error || r.error); setBalances([]); setRecent([]); return }
    setBalances(b.data || []); setRecent(r.data || [])
  }, [crewId])
  useEffect(() => { load() }, [load])

  // Equal split across the given members; cent remainder goes to the payer.
  const add = useCallback(async ({ title, amount, tripId, memberIds }) => {
    const { data: exp, error } = await supabase.from('expenses')
      .insert({ crew_id: crewId, trip_id: tripId || null, title, amount, paid_by: userId }).select('id').single()
    if (error) throw error
    const cents = Math.round(amount * 100)
    const n = memberIds.length
    const base = Math.floor(cents / n)
    let remainder = cents - base * n
    const shares = memberIds.map((uid) => {
      let c = base
      if (uid === userId && remainder > 0) { c += remainder; remainder = 0 }
      return { expense_id: exp.id, user_id: uid, amount: c / 100 }
    })
    if (remainder > 0) shares[0].amount += remainder / 100
    const { error: sErr } = await supabase.from('expense_shares').insert(shares)
    if (sErr) throw sErr
    await load()
  }, [crewId, userId, load])

  return { balances, recent, loading: balances === null || recent === null, error, reload: load, add }
}
