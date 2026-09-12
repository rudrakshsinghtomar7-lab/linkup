// Shared frame for the auth screens (same tokens as the dashboards).
export default function AuthShell({ kick, title, lead, children }) {
  return (
    <div className="gate">
      <section className="card">
        <span className="word">LINK<b>UP</b></span>
        <div className="kick">{kick}</div>
        <h1>{title}</h1>
        {lead && <p>{lead}</p>}
        {children}
      </section>
    </div>
  )
}

export function authMessage(err, fallback = 'That didn’t work. Try again.') {
  const m = err?.message || ''
  if (/Invalid login credentials/i.test(m)) return 'Wrong email or password.'
  if (/already registered/i.test(m)) return 'That email already has an account — sign in instead.'
  if (/Password should be|at least/i.test(m)) return 'Password needs at least 8 characters.'
  if (/rate limit/i.test(m)) return 'Too many attempts — give it a minute.'
  if (/Failed to fetch|NetworkError/i.test(m)) return 'You look offline. Check your connection.'
  console.error(err)
  return fallback
}
