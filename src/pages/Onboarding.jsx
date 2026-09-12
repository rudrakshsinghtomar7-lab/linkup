import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../providers/SessionProvider'
import { Icon } from '../components/Icons'
import { avatarGradient, initials, friendly } from '../lib/format'

// Palette lifted from the mockups' avatar/blip colours.
const SWATCHES = ['#ff5fa2', '#ff1e79', '#ff8a3d', '#ffc24d', '#00e5d0', '#a55cff']

// Feature tour shown once, before the profile step.
const TOUR = [
  { icon: Icon.clock, kick: 'Now', h: 'See what the crew’s doing right now', p: 'A live map of who’s out and where. Drop a plan — “ramen at 7:30?” — and watch the RSVPs roll in. Plans expire on their own, so the feed stays about tonight.' },
  { icon: Icon.map, kick: 'Ghost mode', h: 'Share on your terms', p: 'One tap and you vanish from the map. Location sharing is tied to plans you’re part of — not always-on tracking.' },
  { icon: Icon.pin, kick: 'Trips', h: 'Plan the trip together', p: 'Suggest spots, upvote the best ones, and let the live poll settle the argument. Mark which days you’re free and see when everyone lines up.' },
  { icon: Icon.money, kick: 'Photos & money', h: 'One place for the aftermath', p: 'Upload the hi-res photos to a shared wall, log what you paid, and let LinkUp work out who owes who.' },
]

export default function Onboarding() {
  const { user, profile, reloadProfile } = useSession()
  const [step, setStep] = useState(0) // 0..TOUR.length-1 = tour, TOUR.length = profile
  const [name, setName] = useState('')
  const [color, setColor] = useState(SWATCHES[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // The DB trigger pre-fills display_name from the email; offer it as the starting value.
  useEffect(() => {
    const fromSignup = user?.user_metadata?.display_name
    if ((fromSignup || profile?.display_name) && !name) setName(fromSignup || profile.display_name)
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

  if (step < TOUR.length) {
    const t = TOUR[step]
    return (
      <div className="gate">
        <section className="card tour">
          <span className="word">LINK<b>UP</b></span>
          <div className="kick">{step + 1} of {TOUR.length} · {t.kick}</div>
          <div className="tour-ic"><t.icon /></div>
          <h1>{t.h}</h1>
          <p>{t.p}</p>
          <div className="dots">{TOUR.map((_, i) => <i key={i} className={i === step ? 'on' : ''} />)}</div>
          <button className="btn primary" onClick={() => setStep(step + 1)}>{step === TOUR.length - 1 ? 'Set up my profile' : 'Next'}</button>
          {step < TOUR.length - 1 && <div className="sub"><button className="link" onClick={() => setStep(TOUR.length)}>Skip the tour</button></div>}
        </section>
      </div>
    )
  }

  return (
    <div className="gate">
      <form className="card" onSubmit={save}>
        <span className="word">LINK<b>UP</b></span>
        <div className="kick">Last step</div>
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
