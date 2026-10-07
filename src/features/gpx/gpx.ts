import type { Point, PointInput } from '@/features/points/api'
import type { RouteInput, RouteRow, WaypointInput } from '@/features/routes/api'

const KINDS = ['obstacle', 'camp', 'entrance', 'other']

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

export function toGpx(
  adventure: { name: string },
  points: Point[],
  routes: RouteRow[],
): string {
  const wpts = points
    .map(
      (p) => `  <wpt lat="${p.lat}" lon="${p.lng}"><name>${esc(
        p.name,
      )}</name><type>${esc(p.kind)}</type><desc>${esc(p.note ?? '')}</desc></wpt>`,
    )
    .join('\n')
  const nameOf = (id: string | null) =>
    id ? (points.find((p) => p.id === id)?.name ?? '') : ''
  const trks = routes
    .map((r) => {
      const pts = r.coords
        .map(
          ([lng, lat]) =>
            `      <trkpt lat="${lat}" lon="${lng}"></trkpt>`,
        )
        .join('\n')
      return `  <trk><name>${esc(r.name)}</name><desc>${esc(
        `direction:${r.direction}:${nameOf(r.from_point_id)}→${nameOf(r.to_point_id)}`,
      )}</desc><trkseg>\n${pts}\n  </trkseg></trk>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Route Points" xmlns="http://www.topografix.com/GPX/1/1">
<metadata><name>${esc(adventure.name)}</name></metadata>
${wpts}
${trks}
</gpx>
`
}

export interface GpxRoute {
  route: RouteInput
  waypoints: WaypointInput[]
}

export function fromGpx(
  xml: string,
  adventureId: string,
): { points: PointInput[]; routes: GpxRoute[] } {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('invalid_gpx')

  const points: PointInput[] = [...doc.querySelectorAll('wpt')].map((w) => ({
    adventure_id: adventureId,
    client_id: crypto.randomUUID(),
    name: w.querySelector('name')?.textContent || 'Imported point',
    kind: KINDS.includes(w.querySelector('type')?.textContent ?? '')
      ? w.querySelector('type')!.textContent!
      : 'other',
    seq: null,
    lat: parseFloat(w.getAttribute('lat')!),
    lng: parseFloat(w.getAttribute('lon')!),
    accuracy_m: null,
    note: w.querySelector('desc')?.textContent ?? '',
  }))

  const routes: GpxRoute[] = [
    ...doc.querySelectorAll('trk, rte'),
  ].map((t) => {
    const pts = [...t.querySelectorAll('trkpt, rtept')].map((w, i) => ({
      client_id: crypto.randomUUID(),
      seq: i + 1,
      lat: parseFloat(w.getAttribute('lat')!),
      lng: parseFloat(w.getAttribute('lon')!),
      accuracy_m: null,
      recorded_at:
        w.querySelector('time')?.textContent ?? new Date().toISOString(),
    }))
    return {
      route: {
        adventure_id: adventureId,
        client_id: crypto.randomUUID(),
        name:
          t.querySelector('name')?.textContent ||
          `Route ${points.length ? 1 : 0}`,
        mode: 'manual',
      },
      waypoints: pts,
    }
  })

  return { points, routes }
}
