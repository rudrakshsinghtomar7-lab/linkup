import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { friendly } from '../lib/format'

const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`

// Magic link + 6-digit code. The code path matters for the installed PWA on iOS,
// where the email link opens in Safari rather than the home-screen app.
export default function Login() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function sendLink(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo } })
    setBusy(false)
    if (error) return setError(error.code === 'over_email_send_rate_limit' ? 'Email limit hit for now. If you already have a code, enter it below.' : friendly(error, 'Couldn’t send the link. Check the address and try again.'))
    setSent(true)
  }

  async function verify(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setError(friendly(error, 'That code is wrong or has expired.'))
  }

  return (
    <div className="gate">
      <section className="card">
        <span className="word">LINK<b>UP</b></span>
        <div className="kick">Crew · trips · right now</div>
        {!sent ? (
          <form onSubmit={sendLink}>
            <h1>Sign in</h1>
            <p>We’ll email you a magic link and a 6-digit code. No passwords.</p>
            <label className="field"><span>Email</span>
              <input className="input" type="email" required autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            {error && <div className="state err">{error}</div>}
            <button className="btn primary" disabled={busy || !email}>{busy ? 'Sending…' : 'Send magic link'}</button>
            <div className="sub">Already have a code?<button type="button" className="link" disabled={!email} onClick={() => { setSent(true); setError('') }}>Enter it</button></div>
          </form>
        ) : (
          <form onSubmit={verify}>
            <h1>Check your email</h1>
            <p>Sent to <b style={{ color: 'var(--ink)' }}>{email}</b>. Tap the link, or type the 6-digit code here — handy if you’re in the installed app.</p>
            <label className="field"><span>Code</span>
              <input className="input code" inputMode="numeric" pattern="[0-9]*" maxLength={8} autoComplete="one-time-code" placeholder="••••••" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            </label>
            {error && <div className="state err">{error}</div>}
            <button className="btn primary" disabled={busy || code.length < 6}>{busy ? 'Checking…' : 'Sign in with code'}</button>
            <div className="sub">Wrong address?<button type="button" className="link" onClick={() => { setSent(false); setCode(''); setError('') }}>Start over</button></div>
          </form>
        )}
      </section>
    </div>
  )
}
