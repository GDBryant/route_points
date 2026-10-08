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
Prereqs: Node 22+, npm, Docker (for local Supabase), [Supabase CLI](https://supabase.com/docs/guides/cli).

```sh
git clone <repo-url> route_points && cd route_points
npm install
cp .env.example .env            # fill VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npx supabase start              # local Postgres + Auth + Realtime
npx supabase db push            # apply supabase/migrations
npm run dev                     # https://HOST:5173
```

Test on a phone: set `HOST` in `.env` to your LAN IP. `npm run dev` serves https://HOST:5173 with a self-signed cert and Supabase API is https://HOST:54321 — on the phone open both URLs once and accept the cert warning. Magic-link emails at http://HOST:54324 (Mailpit).

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
./up      # Supabase + web (status monitor, Ctrl-C stops all) → http://192.168.7.58:8080
./down
```
VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY come from `.env` as build args.

## Offline
Points and routes are written to a local IndexedDB (Dexie) outbox and synced to Supabase in FIFO order on reconnect (drain also runs every 30 s, on tab focus, and after each enqueue while online). Failed items retry 5 times then appear under the sync badge for retry/discard. Map tiles for an adventure's bounds can be prefetched (Settings → Offline maps): OpenStreetMap capped at 2500 tiles per adventure (OSM tile-usage policy — bulk downloads must be modest), Esri imagery at 8000, zooms 12–16.

## Deploy
Target: GitHub (source + CI) → Cloudflare Pages (frontend, auto-deploy from `main`) → Supabase cloud (DB/Auth/Realtime, migrations pushed from your machine). All free tier.

### First-time setup

#### 1. GitHub
1. Sign up at github.com. Install [`gh`](https://cli.github.com/) and run `gh auth login`.
2. Repo: https://github.com/GDBryant/route_points. Push:
   ```sh
   git remote add origin git@github.com:GDBryant/route_points.git && git push -u origin main
   ```
   Machines without your personal SSH key (server, CI runner) use a deploy key: `./scripts/github-deploy-key.sh` (title `route-points-deploy-key`).
3. Check **Actions** tab: `CI` runs lint/typecheck/unit tests/build and pgTAP + Playwright against a throwaway local Supabase — no secrets needed.

#### 2. Supabase cloud
1. Sign up at supabase.com (GitHub login works). **New project**: name `route-points`, strong DB password (save it in a password manager, needed for `supabase link`), region nearest your users. Wait ~2 min for provisioning.
2. Note the **Project ref** (Settings → General) — the `xxxx` in `https://xxxx.supabase.co`. Put it in `scripts/deploy-db.sh` (`SUPABASE_PROJECT_REF=`).
3. Push schema from your machine:
   ```sh
   npx supabase login            # opens browser, stores access token
   ./scripts/deploy-db.sh --types   # link + db push + regen src/lib/database.types.ts
   git add src/lib/database.types.ts && git commit -m "chore: cloud DB types"
   ```
   `link` asks for the DB password. Verify in dashboard → Table Editor that the tables exist and Database → Extensions shows `postgis`.
4. Copy API keys: Settings → API → **Project URL** and **anon / publishable** key. Never ship the `service_role` / secret key to the frontend.
5. **Auth → URL Configuration** (fill in after step 3 of Cloudflare below, once you know the URL):
   - Site URL: `https://route-points.pages.dev` (or your custom domain)
   - Redirect URLs: `https://route-points.pages.dev/**`, `https://*.route-points.pages.dev/**` (preview deploys), `https://your.domain/**`
6. **Auth → Providers → Email**: keep enabled, Confirm email on (magic links). Supabase's built-in mailer is dev-only (few emails/hour, may be restricted to team addresses) — set **Project Settings → Auth → SMTP** to a real provider (e.g. Resend/Brevo free tier) before inviting others.
7. **Auth → Providers → Google** (optional, `LoginPage` offers it):
   1. console.cloud.google.com → new project → **APIs & Services → OAuth consent screen**: External, app name, support email; add yourself as test user while in Testing mode (publish to let anyone sign in).
   2. **Credentials → Create credentials → OAuth client ID** → Web application. Authorized redirect URI: `https://<ref>.supabase.co/auth/v1/callback` (shown in the Supabase Google provider panel). Authorized JS origin: your Pages URL.
   3. Paste Client ID + secret into Supabase, enable, save.
8. Realtime is on by default (live positions use broadcast/presence; no table replication needed).

#### 3. Cloudflare Pages
1. Sign up at dash.cloudflare.com (no domain required).
2. **Workers & Pages → Create → Pages → Connect to Git** → authorize the Cloudflare GitHub app for the `route_points` repo.
3. Build settings:
   - Production branch: `main`
   - Framework preset: None (or Vite)
   - Build command: `npm ci --legacy-peer-deps && npm run build`
   - Build output directory: `dist`
   - Environment variables (set for **Production and Preview**): `NODE_VERSION=22`, `VITE_SUPABASE_URL=https://<ref>.supabase.co`, `VITE_SUPABASE_ANON_KEY=<anon key>`
4. **Save and Deploy**. First build ~2 min → `https://route-points.pages.dev`. `public/_redirects` (SPA fallback) and `public/_headers` (no-cache `sw.js`/`index.html`, immutable `assets/`) are picked up automatically.
5. Optional custom domain: project → **Custom domains** → add; Cloudflare handles DNS/TLS if the domain is on Cloudflare, otherwise add the CNAME it shows. Then add the domain to Supabase Site URL / Redirect URLs.
6. Smoke test on a phone: open the URL, request a magic link, click it (must land back on the app logged in), create an adventure, add a point, confirm it appears in Supabase Table Editor. Install the PWA (Add to Home Screen).

Netlify fallback: New site → Import from Git → same env vars; `netlify.toml` already defines build/redirects/headers.

#### 4. GitHub secrets (keepalive)
Repo → **Settings → Secrets and variables → Actions**: add `SUPABASE_URL` and `SUPABASE_ANON_KEY` (cloud values). `.github/workflows/keepalive.yml` pings the API every Monday so the free project isn't paused; trigger it once manually via Actions → Supabase keepalive → Run workflow to confirm it passes.

#### 5. Docker (self-host alternative)
`docker compose up --build` → http://localhost:8080 (nginx serving `dist`, Supabase URL/key baked in from `.env` at build time). Put it behind HTTPS (Caddy/Traefik) — Geolocation and service workers require a secure origin.

### Each deployment cycle
1. **Branch**: `git switch -c feat/x`. Work locally against `npx supabase start`; `npm run lint && npm run typecheck && npm test`.
2. **Schema change?**
   ```sh
   npx supabase migration new <name>   # edit supabase/migrations/<ts>_<name>.sql
   npx supabase db reset               # replay all migrations locally
   npx supabase test db                # pgTAP (RLS/triggers)
   npx supabase gen types typescript --local > src/lib/database.types.ts
   ```
   Keep migrations backward-compatible with the frontend currently live (add columns/tables first, remove in a later release) — DB push and frontend deploy are not atomic.
3. **Push + PR**: `git push -u origin HEAD && gh pr create`. CI runs; Cloudflare builds a **preview** at `https://<hash>.route-points.pages.dev` (link in the PR checks) — test there on a phone; auth works via the wildcard redirect URL.
4. **Deploy DB first** (if step 2): `./scripts/deploy-db.sh`. Check dashboard → Database → Migrations shows the new version.
5. **Merge to `main`** (`gh pr merge --squash`). Cloudflare auto-builds production (~2 min; watch under Deployments). Open PWAs pick up the new service worker on next launch and show the update toast.
6. **Verify**: load the production URL, hard-refresh, run the smoke test from setup step 3.6. Supabase errors: dashboard → Logs → API / Postgres.
7. **Rollback**: Cloudflare Pages → Deployments → previous deployment → **Rollback** (instant). DB rollbacks are a new forward migration — never edit an applied migration file.

### Free tier limits & costs
- Supabase free: 500 MB DB, 200 realtime connections, 2M messages/mo; project **pauses after ~7 days idle** → `.github/workflows/keepalive.yml` pings weekly (set `SUPABASE_URL`/`SUPABASE_ANON_KEY` secrets).
- Cloudflare Pages free: unlimited bandwidth, 500 builds/mo.

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
