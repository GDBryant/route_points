# Route Points — Plan

## Goal
Mobile PWA. Logged-in user creates an **adventure**, logs named **points** (obstacles, tent, entrance) and records **routes** (sequences of GPS way-points) between points. Map shows own live position, other participants, all points and routes. Works offline in dunes; syncs when signal returns.

## Decisions (confirmed)
- Map: Leaflet + OpenStreetMap via react-leaflet
- Stack: Vite + React + TS, vite-plugin-pwa; Supabase (Auth, Postgres+PostGIS, Realtime)
- Offline-first PWA; screen-on tracking with Wake Lock API (no background GPS)
- Multi-user live positions per adventure
- Hosting: Vercel/Netlify + Supabase cloud
- Roles: up to 10 editors per adventure; 100–200 read-only viewers via share link (no login required to view)
- Routes: any direction by default; optional direction set after route completes or when end point is set
- Satellite: Esri World Imagery as optional base layer, downloadable for offline (editors and viewers)
- Sharing: WhatsApp-first share link; opening link → register/login → adventure added to user's list; latest adventure pre-selected on login
- Route snap: route end auto-snaps to a point when within 15–30 m (configurable, default 20 m)
- Full test coverage required (unit + integration + e2e)

## Data model
```
profiles        id (auth.users), display_name, colour
adventures      id, owner_id, name, description, created_at, is_active, share_token (uuid), snap_radius_m (default 20)
adventure_members adventure_id, user_id, role (owner|editor|viewer), joined_at
points          id, adventure_id, name, kind (obstacle|camp|entrance|other), geog point, note, created_by, created_at, client_id (uuid for offline dedupe)
routes          id, adventure_id, name, from_point_id?, to_point_id?, direction (both|forward|reverse), created_by, started_at, ended_at, mode (manual|auto), interval_s?, client_id
waypoints       id, route_id, seq, geog point, accuracy_m, recorded_at, client_id
positions       user_id, adventure_id, geog point, heading, speed, updated_at  (upsert, Realtime broadcast)
```
RLS: editors (max 10, enforced by trigger) read/write; viewers read-only; anonymous read via share_token through a SECURITY DEFINER RPC; owner deletes adventure.

## Features
1. Auth: email magic-link + Google (Supabase)
2. Adventures: Start New Adventure; list sorted by last-opened (latest pre-selected on login); Share → WhatsApp share sheet (Web Share API) / copy link `/join/:share_token`; opening link as guest = viewer mode, after login adventure is added to list
3. Map screen (primary): base layer toggle OSM | Esri World Imagery; own position (heading arrow), other members (coloured dots, name), points (flag markers w/ labels like the Garmin printout), routes (polylines, arrowheads when directional), follow-me toggle, north-up/heading-up, zoom-to-adventure
4. Add point: button → uses current GPS fix, name + kind dialog; long-press map to place manually
5. Record route: start → choose mode
   - Manual: big "Drop waypoint" button
   - Auto: slider, log scale 5 s → 300 s (`v = 5 * (60 ** t)`, t∈[0,1]; snap labels 5s,10s,30s,1m,2m,5m); drops waypoint every interval; also drop on ≥X m moved (optional)
   - Stop → auto-snap end to nearest point within snap_radius_m (15–30 m, default 20); confirm/override; then optional direction (both|forward|reverse)
   - Also: on "Add point" while recording, offer to end route at the new point
6. Live positions: push own position every 5 s when tracking or map open; subscribe via Realtime channel per adventure
7. Offline: Dexie stores adventures/points/routes/waypoints + outbox; service worker caches app shell + OSM and Esri tiles (user picks layer(s) to download) for current adventure bbox (prefetch button, zoom 12–16); sync worker drains outbox on `online`
8. Export/Import: GPX export of adventure (points as wpt, routes as trk); GPX import
9. Edit/delete points & routes; rename; reorder obstacle numbers
10. Viewer mode: read-only map + navigation (distance/bearing to selected point) for 100–200 users on share link, no login

## Screens
- `/login`
- `/adventures` list + create/join
- `/a/:id` map (default) with bottom sheet: Points | Routes | Members
- `/a/:id/record` recording overlay (big buttons, interval slider, elapsed, waypoint count)
- `/settings` profile, colour, units

## Testing
- Unit: Vitest + React Testing Library (slider log-scale, snap logic, outbox sync, GPX, geo utils)
- Integration: Supabase local (`supabase start`) + pgTAP for RLS policies and editor-limit trigger
- E2E: Playwright mobile viewport; mock Geolocation; flows: login, create adventure, add point, record route (manual+auto), snap, share link → viewer, offline → sync
- CI: GitHub Actions runs lint, typecheck, unit, pgTAP, Playwright on PR

## Milestones
- M0 Scaffold: Vite+React+TS, PWA plugin, Supabase client, Leaflet map showing GPS position
- M1 Auth + adventures CRUD + share link/join + roles + RLS migrations (pgTAP)
- M2 Points: add via GPS / long-press, render flags with labels
- M3 Routes: manual + auto recording, interval slider, snap-to-point, direction, polylines
- M4 Offline: Dexie cache + outbox sync + tile prefetch (OSM + Esri)
- M5 Live positions via Realtime + viewer mode
- M6 GPX export/import, polish, install prompt, deploy

## Risks
- iOS Safari: Wake Lock supported ≥16.4; GPS stops when backgrounded → warn user to keep screen on
- OSM tile usage policy: bulk prefetch must be modest (limit zoom/bbox) or use a tile proxy/own tiles later
- GPS accuracy in dunes: store `accuracy_m`, filter waypoints with accuracy > 50 m

## Open questions
- None outstanding. Confirm Esri tile ToS acceptable for offline caching before M4.
