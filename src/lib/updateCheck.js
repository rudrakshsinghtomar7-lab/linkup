// GitHub Pages caches index.html (and iOS caches the installed PWA shell), so a new deploy
// can sit behind a stale page for a long time. On load and whenever the app comes to the
// foreground, fetch index.html fresh and compare the bundle name; reload once if it changed.
const KEY = 'linkup.reloadedFor'

function currentBundle() {
  const s = document.querySelector('script[type=module][src*="/assets/index-"]')
  return s ? s.getAttribute('src').split('/').pop() : null
}

async function check() {
  try {
    const cur = currentBundle(); if (!cur) return
    const res = await fetch(`${import.meta.env.BASE_URL}index.html?u=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    const html = await res.text()
    const m = html.match(/\/assets\/(index-[^"']+\.js)/)
    if (!m || m[1] === cur) return
    if (sessionStorage.getItem(KEY) === m[1]) return // already reloaded for this build; don't loop
    sessionStorage.setItem(KEY, m[1])
    window.location.reload()
  } catch { /* offline or blocked — try again next time */ }
}

export function startUpdateCheck() {
  if (import.meta.env.DEV) return
  check()
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
}
