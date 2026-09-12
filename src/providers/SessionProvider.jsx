import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const Ctx = createContext(null)

// Owns: auth session, the user's profile row, their crews and the active crew (+ roster).
// Everything below the crew gate reads crew/member context from here.
export function SessionProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = still resolving
  const [profile, setProfile] = useState(null)
  const [crews, setCrews] = useState(null)          // null = not loaded
  const [activeCrewId, setActiveCrewId] = useState(null)
  const [members, setMembers] = useState([])
  const [membersError, setMembersError] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  const user = session?.user ?? null

  const loadProfile = useCallback(async () => {
    if (!user) { setProfile(null); return }
    const { data, error } = await supabase.from('profiles').select('id, display_name, color, avatar_url').eq('id', user.id).maybeSingle()
    if (error) console.error(error)
    setProfile(data ?? null)
  }, [user?.id])

  const loadCrews = useCallback(async () => {
    if (!user) { setCrews(null); return }
    const { data, error } = await supabase
      .from('crew_members')
      .select('crew_id, role, crews(id, name, invite_code, created_by, created_at)')
      .eq('user_id', user.id)
    if (error) { console.error(error); setCrews([]); return }
    const list = (data || []).filter((r) => r.crews).map((r) => ({ ...r.crews, role: r.role }))
    setCrews(list)
    // Restore the persisted active crew (user metadata) if we're still a member of it.
    const wanted = user.user_metadata?.active_crew_id
    setActiveCrewId((cur) => {
      const ok = (id) => id && list.some((c) => c.id === id)
      return ok(cur) ? cur : ok(wanted) ? wanted : list[0]?.id ?? null
    })
  }, [user?.id, user?.user_metadata?.active_crew_id])

  useEffect(() => { loadProfile() }, [loadProfile])
  useEffect(() => { loadCrews() }, [loadCrews])

  const loadMembers = useCallback(async () => {
    if (!activeCrewId) { setMembers([]); return }
    const { data, error } = await supabase
      .from('crew_members')
      .select('user_id, role, joined_at, profiles(id, display_name, color, avatar_url)')
      .eq('crew_id', activeCrewId)
      .order('joined_at', { ascending: true })
    if (error) { console.error(error); setMembersError(error); return }
    setMembersError(null)
    setMembers((data || []).filter((m) => m.profiles).map((m) => ({
      id: m.user_id, role: m.role, joined_at: m.joined_at,
      display_name: m.profiles.display_name, color: m.profiles.color, avatar_url: m.profiles.avatar_url,
    })))
  }, [activeCrewId])
  useEffect(() => { loadMembers() }, [loadMembers])

  const selectCrew = useCallback(async (id) => {
    setActiveCrewId(id)
    // Persist across devices; RLS still decides what the crew id can actually read.
    const { error } = await supabase.auth.updateUser({ data: { active_crew_id: id } })
    if (error) console.error(error)
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' }) // this device only, like Acedex — don't kill other devices' sessions
    setProfile(null); setCrews(null); setActiveCrewId(null); setMembers([])
  }, [])

  // Auth helpers (Acedex pattern)
  const signIn = useCallback((email, password) => supabase.auth.signInWithPassword({ email, password }), [])
  const signUp = useCallback((email, password, meta = {}) => supabase.auth.signUp({ email, password, options: { data: meta } }), [])
  const requestPasswordReset = useCallback((email, redirectTo) => supabase.auth.resetPasswordForEmail(email, { redirectTo }), [])
  const updatePassword = useCallback((password) => supabase.auth.updateUser({ password }), [])

  const value = useMemo(() => ({
    session, user, profile, reloadProfile: loadProfile,
    needsOnboarding: !!user && !user.user_metadata?.onboarded,
    crews, reloadCrews: loadCrews,
    activeCrew: crews?.find((c) => c.id === activeCrewId) ?? null,
    selectCrew, members, membersError, reloadMembers: loadMembers,
    me: members.find((m) => m.id === user?.id) ?? (profile ? { id: user?.id, ...profile } : null),
    signOut, signIn, signUp, requestPasswordReset, updatePassword,
  }), [session, user, profile, loadProfile, crews, loadCrews, activeCrewId, selectCrew, members, membersError, loadMembers, signOut, signIn, signUp, requestPasswordReset, updatePassword])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useSession = () => useContext(Ctx)
