import L from 'leaflet'
import type { LivePos } from './usePositions'

const STALE_MS = 60_000

export function memberIcon(p: LivePos, now = Date.now()) {
  const stale = now - p.t > STALE_MS
  const moving = (p.speed ?? 0) > 1 && p.heading != null
  const rot = moving ? `transform:rotate(${p.heading}deg)` : ''
  return L.divIcon({
    className: 'member-marker',
    html: `<div class="mm${stale ? ' mm-stale' : ''}">
      <span class="mm-dot" style="background:${p.colour}"></span>
      ${moving ? `<span class="mm-wedge" style="${rot}"></span>` : ''}
      <span class="mm-label">${p.name || 'member'}</span>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}
