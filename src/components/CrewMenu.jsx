import { useState } from 'react'
import Modal from './Modal'
import { Av } from './Avatar'
import { supabase } from '../lib/supabase'
import { useSession } from '../providers/SessionProvider'
import { useToast } from '../providers/ToastProvider'
import { friendly } from '../lib/format'

// Crew popover: roster, invite code, switch crew, join another, sign out.
export default function CrewMenu({ onClose }) {
  const { activeCrew, crews, members, membersError, reloadMembers, selectCrew, reloadCrews, signOut, user } = useSession()
  const toast = useToast()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function copy() {
    try { await navigator.clipboard.writeText(activeCrew.invite_code); toast('Invite code copied', 'ok') }
    catch { toast('Couldn’t copy — long-press the code instead.') }
  }

  async function join(e) {
    e.preventDefault()
    setBusy(true)
    const { data, error } = await supabase.rpc('join_crew', { code: code.trim() })
    setBusy(false)
    if (error) return toast(friendly(error, 'Couldn’t join with that code.'))
    await reloadCrews(); await selectCrew(data); setCode(''); onClose()
  }

  return (
    <Modal title={activeCrew.name} onClose={onClose}>
      <div className="field"><span>Invite code</span>
        <div className="invite" style={{ margin: '0 0 4px' }}>{activeCrew.invite_code}</div>
        <button className="link" onClick={copy}>Copy code</button>
      </div>
      <div className="field"><span>Crew · {members.length}</span>
        {membersError && <div className="state err">Couldn’t load the crew.<button className="link" onClick={reloadMembers}>Retry</button></div>}
        {members.map((m) => (
          <div className="bal" key={m.id}>
            <Av person={m} />
            <div className="who">{m.id === user.id ? 'You' : m.display_name}<small>{m.role}</small></div>
          </div>
        ))}
      </div>
      {crews.length > 1 && (
        <label className="field"><span>Switch crew</span>
          <select className="input" value={activeCrew.id} onChange={(e) => { selectCrew(e.target.value); onClose() }}>
            {crews.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      )}
      <form className="field" onSubmit={join}><span>Join another crew</span>
        <div className="row2">
          <input className="input" placeholder="invite code" autoCapitalize="none" value={code} onChange={(e) => setCode(e.target.value.toLowerCase())} />
          <button className="btn ghost" disabled={busy || code.trim().length < 4}>{busy ? 'Joining…' : 'Join'}</button>
        </div>
      </form>
      <div className="actions">
        <button className="btn ghost" onClick={signOut}>Sign out</button>
        <button className="btn primary" onClick={onClose}>Done</button>
      </div>
    </Modal>
  )
}
