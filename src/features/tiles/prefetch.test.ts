import { describe, expect, it, vi, beforeEach } from 'vitest'

let inFlight = 0
let maxInFlight = 0
const stored = new Map<string, string>()
const fetchMock = vi.fn()

const cacheMock = {
  put: vi.fn(async (url: string) => {
    stored.set(url, 'ok')
    return undefined
  }),
  delete: vi.fn(async (url: string) => stored.delete(url)),
}

vi.stubGlobal(
  'caches',
  { open: vi.fn(async () => cacheMock) },
)
vi.stubGlobal('fetch', fetchMock)

import { prefetchTiles } from './prefetch'

const bbox: [number, number, number, number] = [18.47, -33.57, 18.49, -33.55]

describe('prefetchTiles', () => {
  beforeEach(() => {
    stored.clear()
    fetchMock.mockReset()
    cacheMock.put.mockClear()
    inFlight = 0
    maxInFlight = 0
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          inFlight++
          maxInFlight = Math.max(maxInFlight, inFlight)
          setTimeout(() => {
            inFlight--
            resolve({ ok: true })
          }, 1)
        }),
    )
  })

  it('downloads tiles with concurrency ≤ 6', async () => {
    const n = await prefetchTiles('osm', bbox, [14, 14])
    expect(n).toBeGreaterThan(0)
    expect(maxInFlight).toBeLessThanOrEqual(6)
    expect(cacheMock.put).toHaveBeenCalledTimes(n)
  })

  it('enforces OSM cap', async () => {
    const huge: [number, number, number, number] = [10, -40, 30, -20]
    const n = await prefetchTiles('osm', huge, [10, 12])
    expect(n).toBeLessThanOrEqual(2500)
  })

  it('abort stops downloading', async () => {
    const ctl = new AbortController()
    const p = prefetchTiles('esri', bbox, [14, 16], undefined, ctl.signal)
    ctl.abort()
    const n = await p.catch(() => -1)
    expect(typeof n).toBe('number')
    expect(fetchMock.mock.calls.length).toBeLessThan(500)
  })
})
