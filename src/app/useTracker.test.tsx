// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import type { Audience, NetworkSize } from '@contracts/api'
import type { TrackerMode } from '@/shared-repositories/trackerEnvironment'
import { forgetCachedTrackers, useTracker } from './useTracker'

function atAddress(path: string) {
  return function Browser({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
  }
}

function renderTracker(mode: TrackerMode, audience: Audience, path: string) {
  return renderHook(() => useTracker(mode, audience), { wrapper: atAddress(path) })
}

function liveApiWithListSizes(sizes: Record<Audience, NetworkSize>) {
  return async (url: string) => {
    const audience: Audience = url.startsWith('/api/contacts') ? 'contacts' : 'followers'
    return new Response(JSON.stringify(sizes[audience]))
  }
}

afterEach(() => {
  forgetCachedTrackers()
  vi.unstubAllGlobals()
})

describe('tracker navigation', () => {
  it('lists open to work before hiring and unfollowers between hiring and scans for followers', () => {
    const { result } = renderTracker('demo', 'followers', '/demo/followers')

    expect(result.current.navItems.map((item) => item.label)).toEqual(['Dashboard', 'Trends', 'Open to Work', 'Hiring', 'Unfollowers', 'Scans', 'Settings'])
  })

  it('lists past contacts for contacts', () => {
    const { result } = renderTracker('demo', 'contacts', '/demo/contacts')

    expect(result.current.navItems[4]).toMatchObject({ label: 'Past contacts', to: '/demo/contacts/departed' })
  })

  it('keeps every page inside the live tracker of the chosen audience', () => {
    const { result } = renderTracker('live', 'contacts', '/contacts')

    expect(result.current.navItems.map((item) => item.to)).toEqual(['/contacts', '/contacts/trends', '/contacts/open-to-work', '/contacts/hiring', '/contacts/departed', '/contacts/scans', '/contacts/settings'])
  })

  it('marks the dashboard as the only page matched exactly', () => {
    const { result } = renderTracker('live', 'followers', '/followers')

    expect(result.current.navItems.map((item) => item.isExact)).toEqual([true, false, false, false, false, false, false])
  })
})

describe('followers and contacts toggle', () => {
  it('keeps the current page when switching audience in the demo', () => {
    const { result } = renderTracker('demo', 'contacts', '/demo/contacts/trends')

    expect(result.current.audienceLinks.map((link) => link.to)).toEqual(['/demo/followers/trends', '/demo/contacts/trends'])
  })

  it('keeps the current page when switching audience in the live tracker', () => {
    const { result } = renderTracker('live', 'followers', '/followers/scans/scan-09-22')

    expect(result.current.audienceLinks.map((link) => link.to)).toEqual(['/followers/scans/scan-09-22', '/contacts/scans/scan-09-22'])
  })

  it('marks the audience being viewed as active', () => {
    const { result } = renderTracker('demo', 'contacts', '/demo/contacts')

    expect(result.current.audienceLinks.map((link) => link.isActive)).toEqual([false, true])
  })

  it('shows how many followers and contacts there are', async () => {
    vi.stubGlobal(
      'fetch',
      liveApiWithListSizes({ followers: { peopleCount: 1_204, latestScanDate: '2026-09-22' }, contacts: { peopleCount: 387, latestScanDate: '2026-09-21' } }),
    )
    const { result } = renderTracker('live', 'followers', '/followers')

    await waitFor(() => expect(result.current.audienceLinks.map((link) => link.detail)).toEqual(['1,204', '387']))
  })

  it('shows 0 for a list that has never been scanned', async () => {
    vi.stubGlobal(
      'fetch',
      liveApiWithListSizes({ followers: { peopleCount: 1_204, latestScanDate: '2026-09-22' }, contacts: { peopleCount: 0, latestScanDate: null } }),
    )
    const { result } = renderTracker('live', 'followers', '/followers')

    await waitFor(() => expect(result.current.audienceLinks.map((link) => link.detail)).toEqual(['1,204', '0']))
  })
})

describe('demo and live tracker', () => {
  it('shows the demo banner inside the demo', () => {
    const { result } = renderTracker('demo', 'followers', '/demo/followers')

    expect(result.current).toMatchObject({ showDemoBanner: true, showDemoInvite: false })
  })

  it('invites live users into the demo instead of showing the banner', () => {
    const { result } = renderTracker('live', 'followers', '/followers')

    expect(result.current).toMatchObject({ showDemoBanner: false, showDemoInvite: true })
  })

  it('links between the demo and the live tracker of the same audience', () => {
    const { result } = renderTracker('demo', 'contacts', '/demo/contacts')

    expect(result.current).toMatchObject({ demoHref: '/demo/contacts', exitDemoHref: '/contacts' })
  })

  it('describes the demo sample for the audience being viewed', () => {
    const { result } = renderTracker('demo', 'contacts', '/demo/contacts')

    expect(result.current.demoSampleDescription).toMatch(/^\d+ fictional contacts/)
  })

  it('reads the demo data for the audience being viewed', () => {
    const { result } = renderTracker('demo', 'contacts', '/demo/contacts')

    expect(result.current.environment).toMatchObject({ isDemo: true, audience: 'contacts', routeBase: '/demo/contacts' })
  })
})
