import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../providers/SessionProvider'
import { friendly } from '../lib/format'

// Shown when the user belongs to no crew. Create → owner; Join → join_crew(code) RPC.
export default function CrewGate() {
  const { user, reloadCrews, selectCrew, signOut } = useSession()
  const [mode, setMode] = useState('pick') // pick | create | join | created
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(null)

  async function create(e) {
    e.preventDefault()
    setBusy(true); setError('')
    // create_crew() (security definer) inserts the crew + owner membership atomically.
    const { data: id, error: cErr } = await supabase.rpc('create_crew', { crew_name: name.trim() })
    if (cErr) { setBusy(false); return setError(friendly(cErr, 'Couldn’t create the crew. Try again.')) }
    const { data, error: rErr } = await supabase.from('crews').select('id, name, invite_code').eq('id', id).single()
    setBusy(false)
    if (rErr) return setError(friendly(rErr, 'Crew created, but couldn’t load it. Refresh.'))
    setCreated(data); setMode('created')
  }

  async function enter(id) {
    await reloadCrews()
    await selectCrew(id)
  }

  async function join(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const { data, error } = await supabase.rpc('join_crew', { code: code.trim() })
    setBusy(false)
    if (error) return setError(friendly(error, 'Couldn’t join with that code.'))
    await enter(data)
  }

  return (
    <div className="gate">
      <div className="card">
        <span className="word">LINK<b>UP</b></span>
        <div className="kick">Your crew</div>

        {mode === 'pick' && (<>
          <h1>Find your people</h1>
          <p>Everything in LinkUp — plans, the map, trips, money — lives inside a crew.</p>
          <button className="btn primary" onClick={() => setMode('create')}>＋ Create a crew</button>
          <button className="btn ghost" onClick={() => setMode('join')}>Join with an invite code</button>
          <div className="sub"><button className="link" onClick={signOut}>Sign out</button></div>
        </>)}

        {mode === 'create' && (
          <form onSubmit={create}>
            <h1>Name your crew</h1>
            <p>You can invite everyone with a code once it’s made.</p>
            <label className="field"><span>Crew name</span>
              <input className="input" required maxLength={40} autoFocus placeholder="e.g. The Gold Coast lot" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            {error && <div className="state err">{error}</div>}
            <button className="btn primary" disabled={busy || !name.trim()}>{busy ? 'Creating…' : 'Create crew'}</button>
            <div className="sub"><button type="button" className="link" onClick={() => { setMode('pick'); setError('') }}>Back</button></div>
          </form>
        )}

        {mode === 'created' && created && (<>
          <h1>{created.name} is live</h1>
          <p>Share this invite code with the crew. They enter it under “Join with an invite code”.</p>
          <div className="invite">{created.invite_code}</div>
          <button className="btn primary" onClick={() => enter(created.id)}>Enter LinkUp</button>
        </>)}

        {mode === 'join' && (
          <form onSubmit={join}>
            <h1>Got a code?</h1>
            <p>Ask whoever made the crew for the 8-character invite code.</p>
            <label className="field"><span>Invite code</span>
              <input className="input code" required autoFocus maxLength={16} autoCapitalize="none" autoCorrect="off" placeholder="a1b2c3d4" value={code} onChange={(e) => setCode(e.target.value.toLowerCase())} />
            </label>
            {error && <div className="state err">{error}</div>}
            <button className="btn primary" disabled={busy || code.trim().length < 4}>{busy ? 'Joining…' : 'Join crew'}</button>
            <div className="sub"><button type="button" className="link" onClick={() => { setMode('pick'); setError('') }}>Back</button></div>
          </form>
        )}
      </div>
    </div>
  )
}
