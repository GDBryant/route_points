# Progress

- [x] M0 Scaffold
- [x] M1 Auth + adventures
- [x] M2 Points
- [x] M3 Routes + recording
- [x] M4 Offline sync + tiles
- [ ] M5 Live positions
- [ ] M6 GPX + deploy

## Log
- 2026-10-07 Plan written (`ai_docs/plan.md`). Awaiting answers to open questions.
- 2026-10-07 Open questions answered; plan updated. Ready for M0.
- 2026-10-07 M0 done: Vite+React+TS PWA scaffold, Leaflet map w/ OSM+Esri layers + GPS follow-me, Supabase client, Dexie dep, Vitest (8 tests) + Playwright e2e, Dockerfile+compose, CI.
- 2026-10-07 M4 done: Dexie cache + outbox (FIFO, attempts≥5 dead, client_id→server id rewrite for dependent payloads), reads via dexie liveQuery, writes optimistic+enqueued, drain on online/visibility/30s/enqueue, SyncBadge with retry/discard, OfflineBanner, tile prefetch (OSM cap 2500 ToS, Esri 8000) + DownloadTilesSheet (zoom 13–17, progress, delete), Esri workbox cache. useRecorder auto now drops only when interval elapsed AND moved ≥5 m. pgTAP 38, unit 67, e2e 7.
- 2026-10-07 M3 done: routes+waypoints tables, upsert_route/add_waypoints (client_id dedupe, batch insert), routes_with_coords view + get_adventure_routes RPC, recording state machine (manual/auto, log slider 5s–5m, accuracy>50m skip, 10-wp/30s flush, wake lock), snap-to-point finish sheet, direction arrowheads, RouteDetailSheet, Routes tab, adventure snap_radius_m setting, guest read-only. Also: point edit flow, panel overlays, FAB GPS-gate, client_id conflict guard. pgTAP 38 total, unit 54, e2e 5.
- 2026-10-07 M2 done: points table (PostGIS geog + lat/lng generated cols, client_id dedupe), upsert_point/get_adventure_points RPCs, Realtime publication, flag+label divIcon markers, AddPointSheet (GPS/long-press, Obstacle N suggest), PointDetailSheet (distance/bearing), PointsList+Members tabs, guest viewer mode. pgTAP 9, unit 28, e2e 3.
- 2026-10-07 M1 done: migration 0001 (profiles/adventures/members, triggers, RLS, join/touch/token RPCs), pgTAP 14 assertions, AuthProvider+LoginPage (magic link+Google), AdventuresPage+ShareSheet, JoinPage w/ guest mode, SettingsPage, DB types generated, e2e auth flow passes.
