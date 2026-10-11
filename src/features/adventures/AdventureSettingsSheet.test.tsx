import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AdventureSettingsSheet from './AdventureSettingsSheet'

const adventure = { id: 'a1', name: 'Dunes', snap_radius_m: 20 }

describe('AdventureSettingsSheet', () => {
  it('Share adventure calls onShare', () => {
    const onShare = vi.fn()
    render(
      <AdventureSettingsSheet
        adventure={adventure}
        isOwner
        onSaved={vi.fn()}
        onShare={onShare}
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Share adventure'))
    expect(onShare).toHaveBeenCalledOnce()
  })

  it('hides Share adventure without onShare', () => {
    render(
      <AdventureSettingsSheet
        adventure={adventure}
        isOwner
        onSaved={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.queryByText('Share adventure')).toBeNull()
  })
})
