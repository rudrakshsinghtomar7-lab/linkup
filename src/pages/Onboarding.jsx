import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../providers/SessionProvider'
import { avatarGradient, initials, friendly } from '../lib/format'

// Palette lifted from the mockups' avatar/blip colours.
const SWATCHES = ['#ff5fa2', '#ff1e79', '#ff8a3d', '#ffc24d', '#00e5d0', '#a55cff']

export default function Onboarding() {
  const { user, profile, reloadProfile } = useSession()
  const [name, setName] = useState('')
  const [color, setColor] = useState(SWATCHES[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // The DB trigger pre-fills display_name from the email; offer it as the starting value.
  useEffect(() => {
    if (profile?.display_name && !name) setName(profile.display_name)
    if (profile?.color && SWATCHES.includes(profile.color)) setColor(profile.color)
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const display_name = name.trim()
    const { error: pErr } = await supabase.from('profiles').upsert({ id: user.id, display_name, color }, { onConflict: 'id' })
    if (pErr) { setBusy(false); return setError(friendly(pErr, 'Couldn’t save your profile. Try again.')) }
    const { error: uErr } = await supabase.auth.updateUser({ data: { onboarded: true, display_name } })
    setBusy(false)
    if (uErr) return setError(friendly(uErr, 'Saved your profile, but couldn’t finish sign-up. Try again.'))
    await reloadProfile()
  }

  return (
    <div className="gate">
      <form className="card" onSubmit={save}>
        <span className="word">LINK<b>UP</b></span>
        <div className="kick">First time here</div>
        <h1>Who are you?</h1>
        <p>This is how the crew sees you on the map and in the feed.</p>
        <div className="preview">
          <div className="av" style={{ background: avatarGradient(color) }}>{initials(name || '?')}</div>
          <div><strong>{name || 'Your name'}</strong><small>{user?.email}</small></div>
        </div>
        <label className="field"><span>Display name</span>
          <input className="input" required maxLength={40} autoFocus placeholder="e.g. Rudy" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="field"><span>Your colour</span>
          <div className="swatches">
            {SWATCHES.map((c) => (
              <button type="button" key={c} className={`swatch ${c === color ? 'on' : ''}`} style={{ background: c }} aria-label={c} onClick={() => setColor(c)} />
            ))}
          </div>
        </div>
        {error && <div className="state err">{error}</div>}
        <button className="btn primary" disabled={busy || !name.trim()}>{busy ? 'Saving…' : 'Let’s go'}</button>
      </form>
    </div>
  )
}
