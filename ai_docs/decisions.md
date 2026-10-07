# Decisions

| Date | Decision | Reason |
|------|----------|--------|
| 2026-10-07 | Leaflet + OSM | Free, no key, offline tiles |
| 2026-10-07 | Vite+React PWA, not native | Installable, no store; Capacitor wrap possible later |
| 2026-10-07 | Supabase | Auth + PostGIS + Realtime, no backend code |
| 2026-10-07 | Offline-first via Dexie outbox | Dunes have no signal |
| 2026-10-07 | Screen-on tracking only (Wake Lock) | PWA cannot do background GPS |
| 2026-10-07 | Multi-user live positions | Requested |
| 2026-10-07 | Hosting Vercel/Netlify + Supabase cloud | Zero ops |
| 2026-10-07 | Auto-drop interval slider log scale 5s–5min | Requested |
| 2026-10-07 | 10 editors / 100–200 viewers per adventure | User spec |
| 2026-10-07 | Routes bidirectional, optional direction on completion | User spec |
| 2026-10-07 | Esri World Imagery optional + downloadable | User spec |
| 2026-10-07 | Share via link (WhatsApp-first), guests view without login | User spec |
| 2026-10-07 | Route end snaps to point within 20 m (15–30 configurable) | User spec |
| 2026-10-07 | Vitest + pgTAP + Playwright, full coverage | User spec |
| 2026-10-07 | adventures_select allows owner_id=auth.uid() OR is_member; RLS helpers volatile | Postgrest runs insert+select in one statement snapshot — trigger-created membership row is invisible to a stable function |
| 2026-10-07 | points writes via upsert_point RPC (client_id dedupe) | Idempotent offline outbox replay for M4 |
| 2026-10-07 | points replica identity full | Realtime DELETE events need old.id |
| 2026-10-07 | waypoints NOT in realtime; batched via add_waypoints (10 wp / 30 s) | Volume too high for realtime; routes table events trigger coord refetch |
| 2026-10-07 | upsert_route on record start, not just finish | add_waypoints needs existing route row (looked up by client_id) |
| 2026-10-07 | Dexie + liveQuery for app reads; guest mode stays network-only | Viewers have no login so no benefit from local cache |
| 2026-10-07 | Outbox: FIFO, server errors retry until 5 (dead), drain rewrites temp point ids → server ids in dependent payloads | FK violations when route references unsynced point |
| 2026-10-07 | Tile caps OSM 2500 / Esri 8000, zoom 12–16 (UI 13–17) | OSM ToS bulk-download policy |
| 2026-10-07 | Auto recording: drop iff interval elapsed AND moved ≥5 m | Movement alone ignored interval; stationary skips |
| 2026-10-07 | Positions via Realtime broadcast (public channel), not postgres_changes | No DB write per tick; free-tier friendly |
| 2026-10-07 | Broadcast 5 s + DB persist 30 s via outbox latest-wins | Balance freshness vs write volume |
