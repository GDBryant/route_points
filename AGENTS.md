# Route Points

Mobile-first PWA for logging named location points and GPS routes between them during off-road "adventures" (e.g. dune obstacle courses). Multi-user live positions.

## Rules
- HARD RULE: Be very brief in all aspects — replies, commit messages, docs, code. Result, reason, next step. No preamble, filler or recaps.
- HARD RULE: No code comments unless asked. Compact code, no over-engineering.
- Read `ai_docs/` before working. Update `ai_docs/decisions.md` when a design choice is made; `ai_docs/progress.md` when a milestone lands.

## Stack
- Vite + React + TypeScript, `vite-plugin-pwa`
- Leaflet + OpenStreetMap (`react-leaflet`)
- Supabase: Auth, Postgres + PostGIS, Realtime
- Offline: IndexedDB (Dexie) queue, sync on reconnect; cached tiles
- Hosting: Cloudflare Pages (Netlify fallback) + Supabase cloud

## Commands
- `npm run dev` / `npm run build` / `npm run preview`
- `npm run lint` (oxlint) / `npm run typecheck` / `npm test` / `npm run format`
- `npm run test:e2e` (Playwright; `npx playwright install chromium` first)
- `npx supabase db push` (migrations in `supabase/migrations/`)
- `docker compose up --build` → http://localhost:8080
- `npm install` may need `--legacy-peer-deps` (npm arborist bug with vitest peers)

## Layout
- `src/` app, `src/features/{auth,adventures,points,routes,map,tracking,sync}`
- `supabase/` migrations, RLS policies
- `ai_docs/` plan, decisions, progress
