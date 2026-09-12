import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../../providers/SessionProvider'
import AuthShell, { authMessage } from './AuthShell'

const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}update-password`

export default function Reset() {
  const { requestPasswordReset } = useSession()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error: err } = await requestPasswordReset(email.trim(), redirectTo)
    setBusy(false)
    if (err) return setError(authMessage(err, 'Couldn’t send the reset email. Try again.'))
    setSent(true)
  }

  return (
    <AuthShell kick="Forgot password" title={sent ? 'Check your email' : 'Reset password'} lead={sent ? `If ${email} has an account, a link to set a new password is on its way.` : 'We’ll email you a link to set a new one.'}>
      {!sent && (
        <form onSubmit={submit}>
          <label className="field"><span>Email</span>
            <input className="input" type="email" required autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {error && <div className="state err">{error}</div>}
          <button className="btn primary" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
      <div className="sub"><Link className="link" to="/login">Back to sign in</Link></div>
    </AuthShell>
  )
}
