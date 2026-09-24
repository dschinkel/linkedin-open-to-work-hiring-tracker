// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ViewDashboard } from './ViewDashboard'

const noScansYet = { scanCount: 0, inboxWaitingCount: 0, scanReminder: null, latestScan: null, latestQuality: null, whoIsHiring: { peopleCount: 0, companyCount: 0, preview: [] } }

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
  it('shows just the drop box before any scan exists', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(noScansYet))))

    renderDashboard()

    expect([await screen.findByText(/Drag LinkedIn screenshots here/), screen.queryByText('Open to Work')]).toEqual([expect.anything(), null])
  })

})
