import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../../providers/SessionProvider'
import AuthShell, { authMessage } from './AuthShell'

// Sign-ups are auto-confirmed (Supabase "Confirm email" is off) so this lands straight in the app.
export default function Signup() {
  const { signUp } = useSession()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const { data, error: err } = await signUp(email.trim(), password, { display_name: name.trim() })
    setBusy(false)
    if (err) return setError(authMessage(err, 'Couldn’t create the account. Try again.'))
    if (!data.session) return setError('Account created, but email confirmation is switched on for this project. Check your inbox, then sign in.')
    navigate('/now', { replace: true })
  }

  return (
    <AuthShell kick="New here" title="Create account" lead="Name, email, password — that’s it.">
      <form onSubmit={submit}>
        <label className="field"><span>Your name</span>
          <input className="input" required maxLength={40} autoComplete="name" placeholder="e.g. Rudy" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field"><span>Email</span>
          <input className="input" type="email" required autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field"><span>Password</span>
          <input className="input" type="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <div className="state err">{error}</div>}
        <button className="btn primary" disabled={busy || !name.trim() || password.length < 8}>{busy ? 'Creating…' : 'Create account'}</button>
        <div className="sub">Already have an account?<Link className="link" to="/login">Sign in</Link></div>
      </form>
    </AuthShell>
  )
}
