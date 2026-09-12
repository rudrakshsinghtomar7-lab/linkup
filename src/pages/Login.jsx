import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { friendly } from '../lib/format'

const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`

// Read ?token_hash=…&type=… placed by the magic-link email template. The link only
// opens the app; verification happens on a button press so inbox link-scanners
// can't burn the one-time token, and it works in whatever browser opened it.
function readLinkToken() {
  const p = new URLSearchParams(window.location.search)
  const token_hash = p.get('token_hash'); const type = p.get('type')
  return token_hash && type ? { token_hash, type } : null
}

// Magic link + 6-digit code. The code path matters for the installed PWA on iOS,
// where the email link opens in Safari rather than the home-screen app.
export default function Login() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [link, setLink] = useState(readLinkToken)

  // Strip the token from the address bar once we've captured it.
  useEffect(() => {
    if (link) window.history.replaceState(null, '', window.location.pathname)
  }, [link])

  async function sendLink(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo } })
    setBusy(false)
    if (error) return setError(error.code === 'over_email_send_rate_limit' ? 'Sign-in emails are paused for up to an hour (sending limit reached). If you already have a code, enter it below.' : friendly(error, 'Couldn’t send the link. Check the address and try again.'))
    setSent(true)
  }

  async function verifyCode(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setError(friendly(error, 'That code is wrong or has expired.'))
  }

  async function confirmLink() {
    setBusy(true); setError('')
    const { error } = await supabase.auth.verifyOtp({ token_hash: link.token_hash, type: link.type })
    setBusy(false)
    if (error) { setError(friendly(error, 'This link has expired or was already used. Request a new one.')); setLink(null) }
  }

  return (
    <div className="gate">
      <section className="card">
        <span className="word">LINK<b>UP</b></span>
        <div className="kick">Crew · trips · right now</div>
        {link ? (<>
          <h1>Confirm sign-in</h1>
          <p>You opened a sign-in link. Tap below to finish signing in on this device.</p>
          {error && <div className="state err">{error}</div>}
          <button className="btn primary" disabled={busy} onClick={confirmLink}>{busy ? 'Signing in…' : 'Confirm sign-in'}</button>
          <div className="sub"><button type="button" className="link" onClick={() => setLink(null)}>Not you? Start over</button></div>
        </>) : !sent ? (
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
          <form onSubmit={verifyCode}>
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
