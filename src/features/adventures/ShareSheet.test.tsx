import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ShareSheet from './ShareSheet'

const props = { token: 'tok123', name: 'Dunes', onClose: vi.fn() }

describe('ShareSheet', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('uses navigator.share when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', {
      value: share,
      configurable: true,
    })
    render(<ShareSheet {...props} />)
    fireEvent.click(screen.getByText('Share…'))
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Dunes',
        url: `${location.origin}/join/tok123`,
      }),
    )
    await vi.waitFor(() => expect(props.onClose).toHaveBeenCalled())
  })

  it('falls back to copy + wa.me link', async () => {
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
    })
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    render(<ShareSheet {...props} />)
    const wa = screen.getByText('WhatsApp')
    expect(wa).toHaveAttribute('href', expect.stringContaining('wa.me'))
    fireEvent.click(screen.getByText('Copy link'))
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('/join/tok123'),
    )
    await vi.waitFor(() => expect(props.onClose).toHaveBeenCalled())
  })
})
