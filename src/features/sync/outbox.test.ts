import { beforeEach, describe, expect, it, vi } from 'vitest'
import { drain, enqueue, MAX_ATTEMPTS } from './outbox'
import { db } from '@/lib/db'

const upsertPoint = vi.fn()
const deletePoint = vi.fn()
vi.mock('@/features/points/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/features/points/api')>()
  return {
    ...mod,
    upsertPoint: (...a: unknown[]) => upsertPoint(...a),
    deletePoint: (...a: unknown[]) => deletePoint(...a),
  }
})

const upsertRoute = vi.fn()
const addWaypoints = vi.fn()
const deleteRoute = vi.fn()
vi.mock('@/features/routes/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/features/routes/api')>()
  return {
    ...mod,
    upsertRoute: (...a: unknown[]) => upsertRoute(...a),
    addWaypoints: (...a: unknown[]) => addWaypoints(...a),
    deleteRoute: (...a: unknown[]) => deleteRoute(...a),
  }
})

const payload = { client_id: crypto.randomUUID(), adventure_id: 'a' }

describe('outbox', () => {
  beforeEach(async () => {
    await db.outbox.clear()
    await db.points.clear()
    upsertPoint.mockReset()
    deletePoint.mockReset()
    upsertRoute.mockReset()
    addWaypoints.mockReset()
    deleteRoute.mockReset()
  })

  it('enqueues and drains successfully, deleting items', async () => {
    upsertPoint.mockResolvedValue({ id: 'srv1' })
    await enqueue('upsert_point', payload)
    expect(await db.outbox.count()).toBe(1)
    const res = await drain()
    expect(res.done).toBe(1)
    expect(await db.outbox.count()).toBe(0)
  })

  it('network failure stops drain and keeps order', async () => {
    upsertPoint
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue({ id: 'srv' })
    await enqueue('upsert_point', payload)
    await enqueue('upsert_point', { ...payload, client_id: 'second' })
    const res = await drain()
    expect(res.stoppedOffline).toBe(true)
    expect(await db.outbox.count()).toBe(2)
    expect(upsertPoint).toHaveBeenCalledTimes(1)
  })

  it('server error increments attempts; dead after 5', async () => {
    const err = Object.assign(new Error('not_editor'), { code: 'P0001' })
    upsertPoint.mockRejectedValue(err)
    await enqueue('upsert_point', payload)
    for (let i = 0; i < MAX_ATTEMPTS; i++) await drain()
    const item = (await db.outbox.toArray())[0]
    expect(item.attempts).toBe(MAX_ATTEMPTS)
    expect(item.last_error).toBe('not_editor')
    await drain()
    expect(upsertPoint).toHaveBeenCalledTimes(MAX_ATTEMPTS)
  })

  it('successful upsert_route replaces temp row by client_id', async () => {
    const cid = crypto.randomUUID()
    await db.routes.put({
      id: cid,
      adventure_id: 'a',
      client_id: cid,
      name: '',
      from_point_id: null,
      to_point_id: null,
      direction: 'both',
      mode: 'manual',
      interval_s: null,
      started_at: null,
      ended_at: null,
      coords: [],
    })
    upsertRoute.mockResolvedValue({ id: 'srv9', name: 'R', direction: 'both' })
    await enqueue('upsert_route', { client_id: cid, adventure_id: 'a' })
    await drain()
    const row = await db.routes.get('srv9')
    expect(row?.client_id).toBe(cid)
    expect(row?.name).toBe('R')
    expect(await db.routes.get(cid)).toBeUndefined()
  })
})
