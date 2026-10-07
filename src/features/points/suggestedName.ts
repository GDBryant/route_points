import type { Point } from './api'

export function suggestedName(points: Point[], kind: string): string {
  if (kind !== 'obstacle') return ''
  const max = points
    .filter((p) => p.kind === 'obstacle')
    .reduce((m, p) => Math.max(m, p.seq ?? 0), 0)
  return `Obstacle ${max + 1}`
}
