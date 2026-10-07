export const SNAP_SECONDS = [5, 10, 30, 60, 120, 300]

export function tToSeconds(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return Math.round(5 * 60 ** c)
}

export function secondsToT(s: number): number {
  const t = Math.log(Math.max(5, Math.min(300, s)) / 5) / Math.log(60)
  return Math.min(1, Math.max(0, t))
}

export function formatInterval(s: number): string {
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r ? `${m}m ${r}s` : `${m}m`
}
