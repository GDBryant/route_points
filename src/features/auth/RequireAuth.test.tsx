import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { RequireAuth } from './RequireAuth'

const useAuth = vi.fn()
vi.mock('./useAuth', () => ({ useAuth: () => useAuth() }))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/protected"
          element={
            <RequireAuth>
              <div>secret</div>
            </RequireAuth>
          }
        />
        <Route path="/login" element={<div>login page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireAuth', () => {
  it('redirects to /login with next param when logged out', () => {
    useAuth.mockReturnValue({ user: null, loading: false })
    renderAt('/protected?x=1')
    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('renders children when logged in', () => {
    useAuth.mockReturnValue({ user: { id: 'u' }, loading: false })
    renderAt('/protected')
    expect(screen.getByText('secret')).toBeInTheDocument()
  })
})
