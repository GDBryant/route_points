import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import JoinPage from './JoinPage'

const navigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>()
  return { ...mod, useNavigate: () => navigate }
})

vi.mock('./api', () => ({
  getByToken: vi.fn().mockResolvedValue({
    id: 'a1',
    name: 'Dunes',
    description: 'desc',
    snap_radius_m: 20,
  }),
  joinByToken: vi.fn().mockResolvedValue('a1'),
}))

const useAuth = vi.fn()
vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => useAuth(),
}))

import { joinByToken } from './api'

function renderJoin() {
  return render(
    <MemoryRouter initialEntries={['/join/tok123']}>
      <Routes>
        <Route path="/join/:token" element={<JoinPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('JoinPage', () => {
  it('guest sees adventure name and join buttons', async () => {
    useAuth.mockReturnValue({ user: null, loading: false })
    renderJoin()
    expect(await screen.findByText('Dunes')).toBeInTheDocument()
    expect(screen.getByText('View as guest')).toBeInTheDocument()
    expect(screen.getByText('Log in to join')).toBeInTheDocument()
    expect(joinByToken).not.toHaveBeenCalled()
  })

  it('logged-in user auto-joins and navigates', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1' }, loading: false })
    renderJoin()
    await waitFor(() =>
      expect(joinByToken).toHaveBeenCalledWith('tok123'),
    )
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('/a/a1', { replace: true }),
    )
  })
})
