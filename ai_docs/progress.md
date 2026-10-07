# Progress

- [x] M0 Scaffold
- [x] M1 Auth + adventures
- [x] M2 Points
- [ ] M3 Routes + recording
- [ ] M4 Offline sync + tiles
- [ ] M5 Live positions
- [ ] M6 GPX + deploy

## Log
- 2026-10-07 Plan written (`ai_docs/plan.md`). Awaiting answers to open questions.
- 2026-10-07 Open questions answered; plan updated. Ready for M0.
- 2026-10-07 M0 done: Vite+React+TS PWA scaffold, Leaflet map w/ OSM+Esri layers + GPS follow-me, Supabase client, Dexie dep, Vitest (8 tests) + Playwright e2e, Dockerfile+compose, CI.
- 2026-10-07 M2 done: points table (PostGIS geog + lat/lng generated cols, client_id dedupe), upsert_point/get_adventure_points RPCs, Realtime publication, flag+label divIcon markers, AddPointSheet (GPS/long-press, Obstacle N suggest), PointDetailSheet (distance/bearing), PointsList+Members tabs, guest viewer mode. pgTAP 9, unit 28, e2e 3.
- 2026-10-07 M1 done: migration 0001 (profiles/adventures/members, triggers, RLS, join/touch/token RPCs), pgTAP 14 assertions, AuthProvider+LoginPage (magic link+Google), AdventuresPage+ShareSheet, JoinPage w/ guest mode, SettingsPage, DB types generated, e2e auth flow passes.
