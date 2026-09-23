// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ViewDashboard } from './ViewDashboard'

const noScansYet = { scanCount: 0, latestScan: null, latestQuality: null, whoIsHiring: { peopleCount: 0, companyCount: 0, preview: [] } }

function renderDashboard() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <ViewDashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('dashboard', () => {
  it('invites the user to drop screenshots before any scan exists', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(noScansYet))))

    renderDashboard()

    expect(await screen.findByText('No scans yet')).toBeInTheDocument()
  })

  it('points a first-time user to the demo', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(noScansYet))))

    renderDashboard()

    expect(await screen.findByRole('link', { name: 'Try the demo with sample data' })).toHaveAttribute('href', '/demo/contacts')
  })
})
