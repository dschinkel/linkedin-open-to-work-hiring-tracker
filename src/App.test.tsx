// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { App } from './App'

const noScansYet = { scanCount: 0, latestScan: null, latestQuality: null, whoIsHiring: { peopleCount: 0, companyCount: 0, preview: [] } }

describe('switching to the demo', () => {
  it('shows the sample data, not the empty real app', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(noScansYet))))
    window.history.pushState({}, '', '/')
    render(<App />)
    await screen.findByText('No scans yet')

    fireEvent.click(screen.getByRole('link', { name: 'Demo' }))

    expect(await screen.findByText('Latest scan: Sep 22, 2026', {}, { timeout: 5000 })).toBeInTheDocument()
  })
})
