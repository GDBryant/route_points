import L from 'leaflet'
import type { Point } from './api'

const KIND_COLOUR: Record<string, string> = {
  obstacle: '#7b1fa2',
  camp: '#2e7d32',
  entrance: '#ef6c00',
  other: '#616161',
}

export function pointIcon(p: Point, moving?: boolean) {
  const colour = KIND_COLOUR[p.kind] ?? KIND_COLOUR.other
  return L.divIcon({
    className: 'point-marker' + (moving ? ' moving' : ''),
    html: `<div class="pm"><span class="pm-flag" style="color:${colour}">⚑</span><span class="pm-label">${p.name}</span></div>`,
    iconSize: [0, 0],
    iconAnchor: [4, 26],
  })
}
