import { db, type OutboxItem, type OutboxKind } from '@/lib/db'
import { deletePoint, upsertPoint, type PointInput } from '@/features/points/api'
import {
  addWaypoints,
  deleteRoute,
  upsertRoute,
  type RouteInput,
  type WaypointInput,
} from '@/features/routes/api'
import {
  upsertPosition,
  type PositionInput,
} from '@/features/live/api'

export const MAX_ATTEMPTS = 5

let drainScheduled = false

export async function enqueue(kind: OutboxKind, payload: unknown) {
  if (kind === 'upsert_position')
    await db.outbox
      .where('kind')
      .equals(kind)
      .delete()
  await db.outbox.add({
    kind,
    payload,
    created_at: new Date().toISOString(),
    attempts: 0,
    last_error: null,
  })
  if (!drainScheduled) {
    drainScheduled = true
    setTimeout(() => {
      drainScheduled = false
      if (navigator.onLine) drain()
    }, 50)
  }
}

function isNetworkError(e: unknown): boolean {
  return (
    e instanceof TypeError ||
    (e instanceof Error && /fetch|network|offline/i.test(e.message))
  )
}

async function run(item: OutboxItem): Promise<unknown> {
  const p = item.payload as Record<string, unknown>
  switch (item.kind) {
    case 'upsert_point':
      return upsertPoint(p as unknown as PointInput)
    case 'delete_point':
      return deletePoint(p.id as string)
    case 'upsert_route':
      return upsertRoute(p as unknown as RouteInput)
    case 'add_waypoints':
      return addWaypoints(
        p.route_client_id as string,
        p.wps as WaypointInput[],
      )
    case 'delete_route':
      return deleteRoute(p.id as string)
    case 'upsert_position':
      return upsertPosition(p as unknown as PositionInput)
  }
}

export interface DrainResult {
  done: number
  failed: number
  stoppedOffline: boolean
}

let draining = false

export async function drain(): Promise<DrainResult> {
  if (draining) return { done: 0, failed: 0, stoppedOffline: false }
  draining = true
  try {
    return await drainLoop()
  } finally {
    draining = false
  }
}

async function drainLoop(): Promise<DrainResult> {
  const res: DrainResult = { done: 0, failed: 0, stoppedOffline: false }
  const attempted = new Set<number>()
  for (;;) {
    const item = await db.outbox
      .orderBy('id')
      .filter((i) => i.attempts < MAX_ATTEMPTS && !attempted.has(i.id!))
      .first()
    if (!item) break
    attempted.add(item.id!)
    try {
      const result = await run(item)
      await db.outbox.delete(item.id!)
      res.done++
      await reconcile(item, result)
    } catch (e) {
      const err =
        (e as { message?: string })?.message ??
        (e instanceof Error ? e.message : String(e))
      if (isNetworkError(e) || !navigator.onLine) {
        await db.outbox.update(item.id!, {
          attempts: item.attempts + 1,
          last_error: err,
        })
        res.stoppedOffline = true
        break
      }
      await db.outbox.update(item.id!, {
        attempts: item.attempts + 1,
        last_error: err,
      })
      res.failed++
    }
  }
  return res
}

async function reconcile(item: OutboxItem, result: unknown) {
  const row = result as Record<string, unknown> | null
  if (!row?.id) return
  if (item.kind === 'upsert_point') {
    const clientId = (item.payload as Record<string, unknown>)
      .client_id as string
    const existing = await db.points
      .where('client_id')
      .equals(clientId)
      .first()
    if (existing && existing.id !== row.id)
      await db.points.delete(existing.id)
    await db.points.put(row as unknown as Parameters<typeof db.points.put>[0])
    const serverId = row.id as string
    const remaining = await db.outbox.toArray()
    for (const i of remaining) {
      const pl = i.payload as Record<string, unknown>
      let changed = false
      for (const k of ['from_point_id', 'to_point_id', 'id']) {
        if (pl[k] === clientId) {
          pl[k] = serverId
          changed = true
        }
      }
      if (changed) await db.outbox.update(i.id!, { payload: pl })
    }
  }
  if (item.kind === 'upsert_route') {
    const clientId = (item.payload as Record<string, unknown>)
      .client_id as string
    const existing = await db.routes
      .where('client_id')
      .equals(clientId)
      .first()
    if (existing) {
      await db.routes.delete(existing.id)
      await db.routes.put({
        ...existing,
        id: row.id as string,
        name: row.name as string,
        direction: row.direction as string,
        ended_at: row.ended_at as string | null,
      })
    }
  }
}

export async function enqueuePosition(payload: PositionInput) {
  await enqueue('upsert_position', payload)
}

export async function pendingCount(): Promise<number> {
  return db.outbox.where('attempts').below(MAX_ATTEMPTS).count()
}
