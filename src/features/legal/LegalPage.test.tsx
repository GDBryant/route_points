import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PrivacyPage, TermsPage } from './LegalPage'

describe('LegalPage', () => {
  it('renders Privacy Policy', () => {
    render(
      <MemoryRouter>
        <PrivacyPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument()
  })

  it('renders Terms of Service', () => {
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Terms of Service')).toBeInTheDocument()
  })
})
