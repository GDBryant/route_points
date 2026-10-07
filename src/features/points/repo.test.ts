import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/lib/db'
import { removePoint, savePointLocal, syncPointsFromServer } from './repo'

vi.mock('./api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./api')>()
  return {
    ...mod,
    listPoints: vi.fn().mockResolvedValue([
      {
        id: 'srv1',
        client_id: 'srv1',
        name: 'remote',
        kind: 'camp',
        seq: null,
        lat: 1,
        lng: 2,
        note: null,
      },
    ]),
  }
})

describe('points repo', () => {
  beforeEach(async () => {
    await db.points.clear()
    await db.outbox.clear()
  })

  it('optimistic write visible in Dexie and enqueued', async () => {
    const p = await savePointLocal('adv1', {
      name: 'Offline Pt',
      kind: 'camp',
      note: '',
      seq: null,
      accuracy_m: null,
      lat: -33.5,
      lng: 18.4,
    })
    expect(await db.points.get(p.id)).toMatchObject({ name: 'Offline Pt' })
    const items = await db.outbox.toArray()
    expect(items).toHaveLength(1)
    expect(items[0].kind).toBe('upsert_point')
    expect((items[0].payload as { client_id: string }).client_id).toBe(
      p.client_id,
    )
  })

  it('syncFromServer keeps unsynced temp rows, removes stale', async () => {
    const temp = await savePointLocal('adv1', {
      name: 'unsent',
      kind: 'obstacle',
      note: '',
      seq: null,
      accuracy_m: null,
      lat: 0,
      lng: 0,
    })
    await db.points.put({
      id: 'stale',
      adventure_id: 'adv1',
      name: 'gone',
      kind: 'other',
      seq: null,
      lat: 0,
      lng: 0,
      note: null,
    })
    await syncPointsFromServer('adv1')
    const ids = (await db.points.where('adventure_id').equals('adv1').toArray())
      .map((p) => p.id)
      .sort()
    expect(ids).toEqual([temp.id, 'srv1'].sort())
  })

  it('removePoint on temp row drops the pending outbox item', async () => {
    const temp = await savePointLocal('adv1', {
      name: 'tmp',
      kind: 'obstacle',
      note: '',
      seq: null,
      accuracy_m: null,
      lat: 0,
      lng: 0,
    })
    await removePoint(temp)
    expect(await db.points.get(temp.id)).toBeUndefined()
    expect(await db.outbox.count()).toBe(0)
  })
})
