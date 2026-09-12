import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { friendly } from '../lib/format'

const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`

// Email + password (same pattern as Acedex). Sign-ups are auto-confirmed on the
// Supabase side so no email is needed to get in; only "forgot password" emails.
export default function Login() {
  const [mode, setMode] = useState('in') // in | up | forgot | reset
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  // A password-recovery link lands here with a session + PASSWORD_RECOVERY event.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') setMode('reset') })
    return () => sub.subscription.unsubscribe()
  }, [])

  const switchTo = (m) => { setMode(m); setError(''); setNote('') }

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError(''); setNote('')
    const em = email.trim()
    let error
    if (mode === 'in') ({ error } = await supabase.auth.signInWithPassword({ email: em, password }))
    else if (mode === 'up') {
      const res = await supabase.auth.signUp({ email: em, password })
      error = res.error
      if (!error && !res.data.session) setNote('Account created — check your email to confirm, then sign in.')
    }
    else if (mode === 'forgot') {
      ;({ error } = await supabase.auth.resetPasswordForEmail(em, { redirectTo }))
      if (!error) setNote('If that address has an account, a reset link is on its way.')
    }
    else if (mode === 'reset') {
      ;({ error } = await supabase.auth.updateUser({ password }))
      if (!error) { setNote('Password updated.'); window.history.replaceState(null, '', window.location.pathname) }
    }
    setBusy(false)
    if (error) {
      const m = error.message || ''
      setError(/Invalid login credentials/i.test(m) ? 'Wrong email or password.'
        : /already registered/i.test(m) ? 'That email already has an account — sign in instead.'
        : /Password should be/i.test(m) || /at least/i.test(m) ? 'Password needs at least 8 characters.'
        : friendly(error, 'That didn’t work. Try again.'))
    }
  }

  const copy = {
    in: { h: 'Sign in', p: 'Welcome back. Your crew’s waiting.', cta: 'Sign in' },
    up: { h: 'Create account', p: 'Email and a password — that’s it. You’ll set your name next.', cta: 'Create account' },
    forgot: { h: 'Forgot password', p: 'We’ll email you a link to set a new one.', cta: 'Send reset link' },
    reset: { h: 'New password', p: 'Pick a new password for your account.', cta: 'Save password' },
  }[mode]
  const needsPassword = mode !== 'forgot'
  const needsEmail = mode !== 'reset'

  return (
    <div className="gate">
      <section className="card">
        <span className="word">LINK<b>UP</b></span>
        <div className="kick">Crew · trips · right now</div>
        <form onSubmit={submit}>
          <h1>{copy.h}</h1>
          <p>{copy.p}</p>
          {needsEmail && (
            <label className="field"><span>Email</span>
              <input className="input" type="email" required autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
          )}
          {needsPassword && (
            <label className="field"><span>Password</span>
              <input className="input" type="password" required minLength={8} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder={mode === 'in' ? '••••••••' : 'at least 8 characters'} value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
          )}
          {error && <div className="state err">{error}</div>}
          {note && <div className="state" style={{ color: 'var(--teal)' }}>{note}</div>}
          <button className="btn primary" disabled={busy || (needsEmail && !email) || (needsPassword && password.length < 8)}>{busy ? 'One sec…' : copy.cta}</button>
          {mode === 'in' && (<>
            <div className="sub">New here?<button type="button" className="link" onClick={() => switchTo('up')}>Create an account</button></div>
            <div className="sub" style={{ marginTop: 6 }}><button type="button" className="link" onClick={() => switchTo('forgot')}>Forgot password?</button></div>
          </>)}
          {mode === 'up' && <div className="sub">Already have an account?<button type="button" className="link" onClick={() => switchTo('in')}>Sign in</button></div>}
          {mode === 'forgot' && <div className="sub"><button type="button" className="link" onClick={() => switchTo('in')}>Back to sign in</button></div>}
        </form>
      </section>
    </div>
  )
}
