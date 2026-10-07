import { haversineM, type LatLng } from '@/lib/geo'
import type { Point } from '@/features/points/api'

export function nearestPoint(
  pos: LatLng | null,
  points: Point[],
  radiusM: number,
): Point | null {
  if (!pos) return null
  let best: Point | null = null
  let bestD = radiusM
  for (const p of points) {
    const d = haversineM(pos, p)
    if (d <= bestD) {
      best = p
      bestD = d
    }
  }
  return best
}
