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

describe('followers and contacts toggle', () => {
  it('switches the demo to the separate followers dashboard', async () => {
    window.history.pushState({}, '', '/demo/contacts')
    render(<App />)
    await screen.findByText('Latest scan: Sep 22, 2026', {}, { timeout: 5000 })

    fireEvent.click(screen.getByRole('link', { name: 'Followers' }))

    expect(await screen.findByRole('link', { name: 'Unfollowers' })).toBeInTheDocument()
  })
})
