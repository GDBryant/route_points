import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import LoginPage from './LoginPage'

const signInWithOtp = vi.fn().mockResolvedValue({ error: null })
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: (...args: unknown[]) => signInWithOtp(...args),
      signInWithOAuth: vi.fn(),
    },
  },
}))

describe('LoginPage', () => {
  it('calls signInWithOtp with the email', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'a@b.co' },
    })
    fireEvent.click(screen.getByText('Send magic link'))
    await vi.waitFor(() =>
      expect(signInWithOtp).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'a@b.co' }),
      ),
    )
    expect(
      await screen.findByText(/Check your email/),
    ).toBeInTheDocument()
  })
})
