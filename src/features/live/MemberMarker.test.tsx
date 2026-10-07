import { describe, expect, it } from 'vitest'
import { memberIcon } from './memberIcon'
import type { LivePos } from './usePositions'

const p = (over: Partial<LivePos> = {}): LivePos => ({
  user_id: 'u1',
  name: 'Bob',
  colour: '#f00',
  lat: 0,
  lng: 0,
  heading: 45,
  speed: 5,
  accuracy: null,
  t: Date.now(),
  ...over,
})

describe('memberIcon', () => {
  it('shows label and rotates wedge by heading when moving', () => {
    const html = memberIcon(p()).options.html as string
    expect(html).toContain('Bob')
    expect(html).toContain('rotate(45deg)')
  })

  it('marks stale when older than 60 s', () => {
    const html = memberIcon(p({ t: Date.now() - 61_000 })).options.html as string
    expect(html).toContain('mm-stale')
  })

  it('no wedge when stationary', () => {
    const html = memberIcon(p({ speed: 0 })).options.html as string
    expect(html).not.toContain('mm-wedge')
  })
})
