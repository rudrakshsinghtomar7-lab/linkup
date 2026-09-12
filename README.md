# LinkUp

Friends' trip-planning and coordination app. Two dashboards: **NOW** (what the crew is doing right now) and **TRIPS** (planning, voting, availability, photos, expenses).

Stack: Vite + React (JavaScript) + React Router + Supabase + Mapbox GL JS + plain CSS.

## Auth

Email + password (Supabase). Sign-ups are auto-confirmed so no mail provider is needed to get in; only password resets send email.

## Local development

```sh
cp .env.example .env.local   # fill in the three values
npm install
npm run dev
```

## Deployment

Pushes to `main` build and deploy to GitHub Pages via `.github/workflows/deploy.yml`. The three `VITE_*` values are injected from repository secrets at build time. Live: https://rudrakshsinghtomar7-lab.github.io/linkup/
