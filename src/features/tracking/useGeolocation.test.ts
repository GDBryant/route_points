import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useGeolocation } from './useGeolocation'

function mockGeo() {
  const watchPosition = vi.fn()
  const clearWatch = vi.fn()
  Object.defineProperty(navigator, 'geolocation', {
    value: { watchPosition, clearWatch },
    configurable: true,
  })
  return { watchPosition, clearWatch }
}

const fix = {
  coords: {
    latitude: -33.5,
    longitude: 18.4,
    accuracy: 10,
    heading: 90,
    speed: 5,
  },
} as GeolocationPosition

describe('useGeolocation', () => {
  it('sets position from watchPosition callback', () => {
    const { watchPosition } = mockGeo()
    watchPosition.mockImplementation((cb: PositionCallback) => {
      cb(fix)
      return 1
    })
    const { result } = renderHook(() => useGeolocation())
    expect(result.current.position).toEqual({
      lat: -33.5,
      lng: 18.4,
      accuracy: 10,
      heading: 90,
      speed: 5,
    })
    expect(result.current.error).toBeNull()
  })

  it('clears watch on unmount', () => {
    const { watchPosition, clearWatch } = mockGeo()
    watchPosition.mockReturnValue(42)
    const { unmount } = renderHook(() => useGeolocation())
    unmount()
    expect(clearWatch).toHaveBeenCalledWith(42)
  })

  it('sets error on error callback', () => {
    const { watchPosition } = mockGeo()
    watchPosition.mockImplementation(
      (_cb: PositionCallback, err: PositionErrorCallback) => {
        err({ message: 'denied' } as GeolocationPositionError)
        return 1
      },
    )
    const { result } = renderHook(() => useGeolocation())
    expect(result.current.error).toBe('denied')
  })
})
