# Progress

- [x] M0 Scaffold
- [x] M1 Auth + adventures
- [x] M2 Points
- [x] M3 Routes + recording
- [x] M4 Offline sync + tiles
- [x] M5 Live positions
- [x] M6 GPX + deploy

## Log

- 2026-10-07 Plan written (`docs/ai_docs/plan.md`). Awaiting answers to open questions.
- 2026-10-07 Open questions answered; plan updated. Ready for M0.
- 2026-10-07 M0 done: Vite+React+TS PWA scaffold, Leaflet map w/ OSM+Esri layers + GPS follow-me, Supabase client, Dexie dep, Vitest (8 tests) + Playwright e2e, Dockerfile+compose, CI.
- 2026-10-07 M6 done: GPX export (download/Web Share) + import via outbox (offline-safe), install prompt + iOS hint, PWA update toast, error boundary, point seq reorder arrows, index.html PWA metas, keepalive workflow, Cloudflare Pages \_headers/\_redirects, netlify.toml, scripts/deploy-db.sh. All milestones complete.
- 2026-10-07 M5 done: live positions via Realtime broadcast channel pos:adventureId (5 s publish, 1 s receive throttle, 10 min prune) + presence (online dots, tap-to-flyTo), positions table persisted via outbox upsert_position every 30 s (latest-wins), get_adventure_positions token RPC (10-min window), MemberMarker (colour dot, heading wedge >1 m/s, stale fade), heading-up map rotation, zoom-to-adventure, NavigateHud (distance + bearing arrow, works for guests), share-my-position toggle. pgTAP 45, unit 76, e2e 8.
- 2026-10-07 M4 done: Dexie cache + outbox (FIFO, attempts≥5 dead, client_id→server id rewrite for dependent payloads), reads via dexie liveQuery, writes optimistic+enqueued, drain on online/visibility/30s/enqueue, SyncBadge with retry/discard, OfflineBanner, tile prefetch (OSM cap 2500 ToS, Esri 8000) + DownloadTilesSheet (zoom 13–17, progress, delete), Esri workbox cache. useRecorder auto now drops only when interval elapsed AND moved ≥5 m. pgTAP 38, unit 67, e2e 7.
- 2026-10-07 M3 done: routes+waypoints tables, upsert_route/add_waypoints (client_id dedupe, batch insert), routes_with_coords view + get_adventure_routes RPC, recording state machine (manual/auto, log slider 5s–5m, accuracy>50m skip, 10-wp/30s flush, wake lock), snap-to-point finish sheet, direction arrowheads, RouteDetailSheet, Routes tab, adventure snap_radius_m setting, guest read-only. Also: point edit flow, panel overlays, FAB GPS-gate, client_id conflict guard. pgTAP 38 total, unit 54, e2e 5.
- 2026-10-07 M2 done: points table (PostGIS geog + lat/lng generated cols, client_id dedupe), upsert_point/get_adventure_points RPCs, Realtime publication, flag+label divIcon markers, AddPointSheet (GPS/long-press, Obstacle N suggest), PointDetailSheet (distance/bearing), PointsList+Members tabs, guest viewer mode. pgTAP 9, unit 28, e2e 3.
- 2026-10-07 M1 done: migration 0001 (profiles/adventures/members, triggers, RLS, join/touch/token RPCs), pgTAP 14 assertions, AuthProvider+LoginPage (magic link+Google), AdventuresPage+ShareSheet, JoinPage w/ guest mode, SettingsPage, DB types generated, e2e auth flow passes.
- 2026-10-08 Dev infra: Caddy container terminates TLS (internal CA, serves root.crt on http), single origin https://HOST — /supabase/\* → Kong on host, rest → vite container (bind mount, alpine node_modules); nginx web still on 8080; ./up follows container logs, Ctrl-C stops all. Magic-link verify → https://HOST/adventures proven end-to-end.
- 2026-10-08 Route edit (name/from/to/direction via RouteDetailSheet edit mode → upsert_route), FinishRouteSheet "New point at end" (save point mid-flow, To preselected), migration 0005 makes server pk = client_id.
- 2026-10-17 Deployed: Supabase resumed + 0005 pushed, Cloudflare Pages https://route-points.pages.dev (build vars VITE\_\*, NODE_VERSION=24), keepalive workflow pings adventures table. Custom domain rpa.roamingsolutions.net pending (CNAME → route-points.pages.dev).
- 2026-10-17 UX: routes connected to endpoints, geolocation timeout, controls below banner, sync badge moved, Install/Exit in settings + ⎋ tab, README deploy docs. Custom domain rpa.roamingsolutions.net live. Google OAuth pending (console steps in README).
- 2026-10-17 Google OAuth live (Workspace project, External audience). Logo + PWA icons, /privacy + /terms pages. Migration 0006: pg_cron nightly purge of adventures/users inactive >60 days, pushed to cloud.
- 2026-10-17 Delete adventure, owner-only, cascades + local cache cleared.
- 2026-10-17 Sync UX: SVG icon, tap toast, amber when unsynced/offline; failed items get Later (1h snooze) instead of Discard — queued writes never dropped.
- 2026-10-17 Delete fix: removePoint/removeRoute always queue server delete (id==client_id since 0005 broke the never-synced check); sync ignores rows with pending delete. Points/Routes tabs get Delete buttons. v0.2.1. Rule: bump version every push.
