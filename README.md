# LinkUp

Friends' trip-planning and coordination app. Two dashboards: **NOW** (what the crew is doing right now) and **TRIPS** (planning, voting, availability, photos, expenses).

Stack: Vite + React (JavaScript) + React Router + Supabase + Mapbox GL JS + plain CSS.

## Auth

Email + password (Supabase). Sign-ups are auto-confirmed so no mail provider is needed to get in; only password resets send email.

## Live location (Phase 2) — foreground only

While NOW is open, the app uses `navigator.geolocation.watchPosition()` and writes the user's own
`locations` row for the active crew at most every 30 s and only after moving ≥ 25 m. Writing is gated
client-side by the sharing scope (`off` · `plan` = only while a crew plan is active · `hours` = until
`share_until`, then auto-reverts to `off` · `always`) and stops immediately when Ghost mode is on or the
tab is hidden. Reading is governed by RLS (ghosted rows are invisible to crewmates); a payload-free
Realtime broadcast plus a 30 s poll keeps crewmates' maps in sync when RLS hides a change. Blips older
than 2 min are shown stale, older than 15 min greyed with a "last seen" time — never as live.

**Platform limit:** this is a web PWA. iOS Safari (and, less predictably, Android) suspend JavaScript
and geolocation soon after the app leaves the foreground, so there is **no background tracking** and
none is simulated. True always-on/background location would need a native wrapper (e.g. Capacitor) —
a possible Phase 3, not built here.

## Local development

```sh
cp .env.example .env.local   # fill in the three values
npm install
npm run dev
```

## Smoke test

`SMOKE_EMAIL=… SMOKE_PASSWORD=… npm run smoke` drives the live site in headless Chromium (needs `npx playwright install chromium` once): deep-link fallback, login, both dashboards, ghost round-trip, session across refresh, 390px overflow, manifest.

## Deployment

Pushes to `main` build and deploy to GitHub Pages via `.github/workflows/deploy.yml`. The three `VITE_*` values are injected from repository secrets at build time. Live: https://rudrakshsinghtomar7-lab.github.io/linkup/
