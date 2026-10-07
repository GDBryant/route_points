import { describe, expect, it } from 'vitest'
import { estimateBytes, lngLatToTile, tilesInBbox } from './tileMath'

describe('tileMath', () => {
  it('computes known tile for Atlantis Dunes at z14', () => {
    expect(lngLatToTile(18.48, -33.56, 14)).toEqual({ x: 9033, y: 9815 })
  })

  it('counts 1x1 tile bbox over 3 zooms', () => {
    const t = lngLatToTile(18.48, -33.56, 14)
    const bbox: [number, number, number, number] = [18.4, -33.6, 18.5, -33.5]
    const z14 = tilesInBbox(bbox, 14, 14)
    expect(z14.length).toBeGreaterThanOrEqual(1)
    expect(z14.some((x) => x.x === t.x && x.y === t.y)).toBe(true)
    const multi = tilesInBbox(bbox, 12, 14)
    const z13 = tilesInBbox(bbox, 13, 13).length
    const z12 = tilesInBbox(bbox, 12, 12).length
    expect(multi.length).toBe(z14.length + z13 + z12)
  })

  it('estimates ~20 KB per tile', () => {
    expect(estimateBytes(10)).toBe(10 * 20 * 1024)
  })
})
