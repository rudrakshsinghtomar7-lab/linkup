// Small presentation helpers shared by both dashboards.

export function initials(name) {
  if (!name) return '?'
  const parts = String(name).trim().split(/\s+/)
  const s = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 1)
  return s.toUpperCase()
}

// Avatar treatment from the mockups: profile colour fading into the dark plum.
export function avatarGradient(color) {
  return `linear-gradient(135deg,${color || '#ff5fa2'},#3a0f26)`
}

export function money(n) {
  return Number(n || 0).toFixed(2)
}

export function timeAgo(iso) {
  if (!iso) return ''
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 45) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} hr${Math.round(s / 3600) === 1 ? '' : 's'} ago`
  return `${Math.round(s / 86400)}d ago`
}

export function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase()
}

export function fmtDate(d) {
  if (!d) return ''
  return new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
}

// Turn a Supabase/PostgREST error into something safe to show. Details go to the console.
export function friendly(err, fallback = 'Something went wrong. Try again.') {
  if (err) console.error(err)
  const msg = err?.message || ''
  if (/invalid invite code/i.test(msg)) return 'That invite code doesn’t match any crew.'
  if (/must be signed in/i.test(msg)) return 'You need to be signed in.'
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'You look offline. Check your connection.'
  if (/rate limit/i.test(msg)) return 'Too many attempts — give it a minute.'
  if (/Token has expired|otp_expired|invalid/i.test(msg) && /otp|token/i.test(msg)) return 'That code is wrong or has expired.'
  return fallback
}
