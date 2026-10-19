# Architecture refactor plan

Goal: make adding features cheap. Audit 2026-10-19 (v0.3.1) found a 763-line `MapPage`, per-entity copy-paste (points/routes repo+hook+api), sync layer hard-wired to every feature, and 1 Hz GPS re-rendering the whole map.

Order: 1 → 2 → 3 → 4. Each phase: tests first, behaviour preserved, version bump, row in `decisions.md`.

## Status

| Phase                         | Status                                                                 | Version |
| ----------------------------- | ---------------------------------------------------------------------- | ------- |
| 1 Decompose MapPage           | DONE 2026-10-19 (uncommitted)                                          | 0.3.2   |
| 2 Generic synced-entity layer | todo                                                                   |         |
| 3 Render performance          | todo                                                                   |         |
| 4 Cross-cutting infra         | todo                                                                   |         |
| 5 Quality gates               | partial — characterisation tests done; bundle budget / Lighthouse todo |         |

## Phase 1 — Decompose MapPage (DONE)

- `src/features/map/`: `useAdventure` (role/adv/guest), `useMovePoint`, `useRecordingFlow` (recorder + add/start/turn/end/finish state machine, owns `adding`), `MapBanners`, `MapControls`, `MembersTab`, `TabBar`, `AdventureSheets` (`Sheet` union replaces 4 booleans).
- Helpers: `pointInput`/`swapSeq` (`points/repo.ts`), `shareGpx` (`gpx/gpx.ts`), `boundsOf` (`tiles/tileMath.ts`), `FlyTarget` exported from `MapView`.
- `MapPage.test.tsx`: 11 characterisation tests (guest, FAB gate, long-press, start/stop prompts, snap finish, tabs, move, reorder, sheets). Green before and after.
- Result: `MapPage` 763 → 357 lines (remaining is JSX composition; Phase 2 context removes prop threading). Target ≤150 deferred.

## Phase 2 — Generic synced-entity layer

- `lib/entity.ts`: `defineEntity<T>({ table, kindUpsert, kindDelete, list, listByToken, upsert, remove, subscribe, toPayload, fromServer, onReconcile? })`.
- Generates `repo` (`syncFromServer`, `saveLocal`, `remove`) and `useEntity(opts)`; `points`/`routes` become ~30-line definitions. Routes keep coords-preservation and `add_waypoints` via `onReconcile`.
- Outbox becomes a registry: `registerOutboxHandler(kind, { run, reconcile, dependsOn: ["from_point_id", ...] })`; `sync/outbox.ts` stops importing feature code (breaks sync↔feature cycle).
- `AdventureContext` providing `adv, role, isEditor, points, routes, guest` so sheets stop taking 10 props.
- Single data-source abstraction for token (guest) vs member reads.

## Phase 3 — Render performance

- `memo(PointMarker|RoutePolyline|MemberMarker)`; `useMemo` for `others` array, `byId`, bbox.
- `PositionContext` so 1 Hz GPS updates re-render only `CurrentPositionMarker`, `FollowMe`, `NavigateHud`, FAB gate.
- `React.lazy` for `MapPage`, `LegalPage`, `GpxSheet`, `DownloadTilesSheet`, `SettingsPage`; `manualChunks` for leaflet/supabase/dexie (bundle 798 kB today).
- `rollup-plugin-visualizer` report + size budget in CI.

## Phase 4 — Cross-cutting infra

- `lib/prefs.ts`: typed `usePref(key)` over `localStorage` (today scattered in `MapPage`, `RecordSheet`, `useGeolocation`).
- `permissions.ts`: `can(role, action)` replacing ad-hoc `isEditor`/`isOwner`.
- `adventure.settings jsonb` migration for per-adventure options (snap radius, units, kinds…).
- CSS Modules per component; tokens stay in `index.css` (700 lines flat today).
- Reads via Dexie `liveQuery` only; drop manual `refresh()` calls.

## Phase 5 — Quality gates

- [x] Characterisation tests for MapPage flows.
- [ ] Bundle size budget (`size-limit`) in CI.
- [ ] Lighthouse CI on Cloudflare preview.
- [ ] ADR row per phase in `decisions.md`.
