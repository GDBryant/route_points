import { bearingDeg, haversineM } from '@/lib/geo'

export function arrowPositions(coords: [number, number][]) {
  const arrows: { pos: [number, number]; bearing: number }[] = []
  if (coords.length < 2) return arrows
  for (let i = 0; i < coords.length - 1; i += 5) {
    const j = Math.min(i + 1, coords.length - 1)
    const [lng1, lat1] = coords[i]
    const [lng2, lat2] = coords[j]
    arrows.push({
      pos: [(lat1 + lat2) / 2, (lng1 + lng2) / 2],
      bearing: bearingDeg({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 }),
    })
  }
  return arrows
}

export function routeLengthM(coords: [number, number][]): number {
  let d = 0
  for (let i = 1; i < coords.length; i++) {
    d += haversineM(
      { lat: coords[i - 1][1], lng: coords[i - 1][0] },
      { lat: coords[i][1], lng: coords[i][0] },
    )
  }
  return d
}
