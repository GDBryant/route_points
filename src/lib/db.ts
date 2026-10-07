import Dexie, { type Table } from 'dexie'
import type { Point } from '@/features/points/api'
import type { RouteRow } from '@/features/routes/api'

export interface AdventureRow {
  id: string
  name: string
  snap_radius_m: number
  share_token: string
  role: string
  last_opened_at: string
}

export type OutboxKind =
  | 'upsert_point'
  | 'delete_point'
  | 'upsert_route'
  | 'add_waypoints'
  | 'delete_route'

export interface OutboxItem {
  id?: number
  kind: OutboxKind
  payload: unknown
  created_at: string
  attempts: number
  last_error: string | null
}

export interface TileMeta {
  adventure_id: string
  layer: string
  bbox: [number, number, number, number]
  zooms: [number, number]
  count: number
  bytes: number
  downloaded_at: string
}

export class RoutePointsDB extends Dexie {
  adventures!: Table<AdventureRow, string>
  points!: Table<Point & { adventure_id: string }, string>
  routes!: Table<RouteRow, string>
  outbox!: Table<OutboxItem, number>
  tiles_meta!: Table<TileMeta, [string, string]>

  constructor(name = 'route_points') {
    super(name)
    this.version(1).stores({
      adventures: 'id',
      points: 'id, client_id, adventure_id',
      routes: 'id, client_id, adventure_id',
      outbox: '++id, created_at, attempts',
      tiles_meta: '[adventure_id+layer]',
    })
  }
}

export const db = new RoutePointsDB()
