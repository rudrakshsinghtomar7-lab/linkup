import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../../providers/SessionProvider'
import AuthShell, { authMessage } from './AuthShell'

// Landing page for the reset-password email. The link creates a recovery session;
// this screen is reachable with or without one (Acedex pattern).
export default function UpdatePassword() {
  const { session, updatePassword } = useSession()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (password !== confirm) return setError('Passwords don’t match.')
    setBusy(true); setError('')
    const { error: err } = await updatePassword(password)
    setBusy(false)
    if (err) return setError(authMessage(err, 'Couldn’t update the password. Try again.'))
    navigate('/now', { replace: true })
  }

  if (session === undefined) return <AuthShell kick="One sec" title="Loading…" />
  if (!session) return (
    <AuthShell kick="Reset link expired" title="Try again" lead="This reset link is invalid or has expired. Request a new one from the sign-in page.">
      <div className="sub"><Link className="link" to="/reset">Request a new link</Link></div>
    </AuthShell>
  )

  return (
    <AuthShell kick="Set a new password" title="New password" lead={`For ${session.user.email}.`}>
      <form onSubmit={submit}>
        <label className="field"><span>New password</span>
          <input className="input" type="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="field"><span>Confirm</span>
          <input className="input" type="password" required minLength={8} autoComplete="new-password" placeholder="Same again" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        {error && <div className="state err">{error}</div>}
        <button className="btn primary" disabled={busy || password.length < 8}>{busy ? 'Saving…' : 'Save password'}</button>
      </form>
    </AuthShell>
  )
}
