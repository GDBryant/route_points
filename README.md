# Route Points

Mobile-first PWA for off-road adventures. Create an **adventure**, drop named **points** (obstacles, camp, entrance) and record **routes** between them from your phone's GPS. See your position, teammates' live positions, and all points/routes on a map — online or offline in the dunes.

Built for events where drivers must reach a series of obstacles with no roads: the recorded routes are the only way around.

## Features
- Points: add at current GPS fix or by long-press on map; flag markers with labels
- Routes: manual "drop waypoint" button or auto-drop on a 5 s – 5 min log-scale interval; route end snaps to a nearby point (default 20 m); optional direction
- Live positions of up to 10 editors; 100–200 read-only viewers via share link (no login)
- Share adventure via WhatsApp / copy link
- Offline-first: points and routes queued locally and synced later; downloadable OSM and Esri satellite tiles
- GPX export/import
- Installable PWA (Android/iOS), screen-on tracking via Wake Lock

## Stack
- Vite + React + TypeScript, `vite-plugin-pwa`
- Leaflet + OpenStreetMap / Esri World Imagery (`react-leaflet`)
- Supabase: Auth, Postgres + PostGIS, Realtime
- Dexie (IndexedDB) offline store + outbox
- Tests: Vitest, pgTAP, Playwright

## Setup
Prereqs: Node 20+, npm, Docker (for local Supabase), [Supabase CLI](https://supabase.com/docs/guides/cli).

```sh
git clone <repo-url> route_points && cd route_points
npm install
cp .env.example .env            # fill VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npx supabase start              # local Postgres + Auth + Realtime
npx supabase db push            # apply supabase/migrations
npm run dev                     # http://localhost:5173
```

Test on a phone: run `npm run dev -- --host` and open the LAN URL over HTTPS (GPS requires a secure context; use `vite-plugin-mkcert` or a tunnel such as `npx localtunnel`).

## Commands
| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` / `npm run preview` | Production build / serve |
| `npm run lint` / `npm run typecheck` | ESLint / tsc |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright (mobile viewport, mocked Geolocation) |
| `npx supabase test db` | pgTAP RLS/trigger tests |
| `npx supabase gen types typescript --local > src/lib/database.types.ts` | Regenerate DB types |
| `npx supabase db push` | Apply migrations |

## Run with Docker
```sh
docker compose up --build     # http://localhost:8080
```
VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are passed as build args. Backend runs on the host via `npx supabase start` (the Supabase CLI manages its own containers).

## Deploy
- Frontend: Vercel or Netlify (build `npm run build`, output `dist/`)
- Backend: Supabase cloud project; set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in host env; `npx supabase link && npx supabase db push`

## Layout
```
src/features/{auth,adventures,points,routes,map,tracking,sync}
supabase/migrations/      SQL migrations + RLS
supabase/tests/           pgTAP
e2e/                      Playwright
ai_docs/                  plan, decisions, progress
```

## Docs
- `ai_docs/plan.md` — full plan, data model, milestones
- `ai_docs/decisions.md` — decision log
- `ai_docs/progress.md` — milestone status
