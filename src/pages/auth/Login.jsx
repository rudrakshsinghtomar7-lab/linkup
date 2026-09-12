import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../../providers/SessionProvider'
import AuthShell, { authMessage } from './AuthShell'

export default function Login() {
  const { signIn } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/now'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error: err } = await signIn(email.trim(), password)
    setBusy(false)
    if (err) return setError(authMessage(err, 'Sign-in failed. Try again.'))
    navigate(from, { replace: true })
  }

  return (
    <AuthShell kick="Welcome back" title="Sign in" lead="Your crew’s waiting.">
      <form onSubmit={submit}>
        <label className="field"><span>Email</span>
          <input className="input" type="email" required autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field"><span>Password</span>
          <input className="input" type="password" required autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <div className="state err">{error}</div>}
        <button className="btn primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <div className="sub"><Link className="link" to="/reset">Forgot your password?</Link></div>
        <div className="sub" style={{ marginTop: 8 }}>New here?<Link className="link" to="/signup">Create an account</Link></div>
      </form>
    </AuthShell>
  )
}
