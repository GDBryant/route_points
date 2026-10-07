import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import RecordSheet from './RecordSheet'
import { secondsToT, tToSeconds } from './interval'

describe('RecordSheet', () => {
  it('updates interval label when slider moves', () => {
    render(
      <RecordSheet
        state="idle"
        waypointCount={0}
        elapsedS={0}
        onStart={vi.fn()}
        onDrop={vi.fn()}
        onStop={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Auto'))
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '1' } })
    expect(
      document.querySelector('.slider-label')!.textContent,
    ).toBe('5m')
    fireEvent.change(slider, { target: { value: '0' } })
    expect(
      document.querySelector('.slider-label')!.textContent,
    ).toBe('5s')
  })

  it('Start passes mode and mapped interval', () => {
    const onStart = vi.fn()
    render(
      <RecordSheet
        state="idle"
        waypointCount={0}
        elapsedS={0}
        onStart={onStart}
        onDrop={vi.fn()}
        onStop={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Auto'))
    const slider = screen.getByRole('slider')
    const t = secondsToT(30)
    fireEvent.change(slider, { target: { value: String(t) } })
    fireEvent.click(screen.getByText('Start route'))
    expect(onStart).toHaveBeenCalledWith('auto', tToSeconds(t))

    fireEvent.click(screen.getByText('Manual'))
    fireEvent.click(screen.getByText('Start route'))
    expect(onStart).toHaveBeenCalledWith('manual', null)
  })
})
