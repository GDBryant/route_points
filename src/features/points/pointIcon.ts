import L from "leaflet";
import type { Point } from "./api";
import { KIND_COLOUR, type Kind } from "./kinds";

export function pointIcon(p: Point, moving?: boolean) {
  const colour = KIND_COLOUR[p.kind as Kind] ?? KIND_COLOUR.other;
  return L.divIcon({
    className: "point-marker" + (moving ? " moving" : ""),
    html: `<div class="pm"><svg class="pm-flag" viewBox="0 0 20 34" width="20" height="34"><line x1="2.5" y1="1" x2="2.5" y2="34" stroke="#222" stroke-width="2"/><path d="M3.5 2h14l-4 5 4 5h-14z" fill="${colour}" stroke="#fff" stroke-width="0.8"/></svg><span class="pm-label">${p.name}</span></div>`,
    iconSize: [0, 0],
    iconAnchor: [2.5, 34],
  });
}
