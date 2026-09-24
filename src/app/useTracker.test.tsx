// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import type { AudienceChoice, NetworkSize } from '@contracts/api'
import type { TrackerMode } from '@/shared-repositories/trackerEnvironment'
import { forgetCachedTrackers } from '@/shared-repositories/trackerQueryClients'
import { useTracker } from './useTracker'

function atAddress(path: string) {
  return function Browser({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
  }
}

function renderTracker(mode: TrackerMode, audience: AudienceChoice, path: string) {
  return renderHook(() => useTracker(mode, audience), { wrapper: atAddress(path) })
}

function liveApiWithListSizes(sizes: Record<AudienceChoice, NetworkSize>) {
  return async (url: string) => {
    const audience = (['all', 'contacts', 'followers'] as const).find((each) => url.startsWith(`/api/${each}/`)) ?? 'followers'
    return new Response(JSON.stringify(sizes[audience]))
  }
}

afterEach(() => {
  forgetCachedTrackers()
  vi.unstubAllGlobals()
})

describe('tracker navigation', () => {

  it('lists past contacts for contacts', () => {
    const { result } = renderTracker('demo', 'contacts', '/demo/contacts')

    expect(result.current.navItems[4]).toMatchObject({ label: 'Past connections', to: '/demo/contacts/departed' })
  })

  it('keeps every page inside the live tracker of the chosen audience', () => {
    const { result } = renderTracker('live', 'contacts', '/contacts')

    expect(result.current.navItems.map((item) => item.to)).toEqual(['/contacts', '/contacts/trends', '/contacts/open-to-work', '/contacts/hiring', '/contacts/departed', '/contacts/scans', '/contacts/settings'])
  })

  it('offers the dashboard and the Open to Work and Hiring lists for all audiences together', () => {
    const { result } = renderTracker('live', 'all', '/all/hiring')
    expect(result.current.navItems.map((item) => [item.label, item.to, item.isExact])).toEqual([
      ['Dashboard', '/all', true],
      ['Open to Work', '/all/open-to-work', false],
      ['Hiring', '/all/hiring', false],
    ])
  })

  it('sends any other page of all audiences together to their dashboard', () => {
    const { result } = renderTracker('demo', 'all', '/demo/all/trends')
    expect(result.current).toMatchObject({ showsEveryPage: false, allHome: '/demo/all' })
  })

  it('shows every page for a single audience', () => {
    const { result } = renderTracker('live', 'contacts', '/contacts')
    expect(result.current.showsEveryPage).toBe(true)
  })

  it('marks the dashboard as the only page matched exactly', () => {
    const { result } = renderTracker('live', 'followers', '/followers')

    expect(result.current.navItems.map((item) => item.isExact)).toEqual([true, false, false, false, false, false, false])
  })
})

describe('followers and contacts toggle', () => {
  it('keeps the current page when switching audience in the demo', () => {
    const { result } = renderTracker('demo', 'contacts', '/demo/contacts/trends')

    expect(result.current.audienceLinks.map((link) => link.to).slice(1)).toEqual(['/demo/followers/trends', '/demo/contacts/trends'])
  })

  it('keeps the current page when switching audience in the live tracker', () => {
    const { result } = renderTracker('live', 'followers', '/followers/scans/scan-09-22')

    expect(result.current.audienceLinks.map((link) => link.to).slice(1)).toEqual(['/followers/scans/scan-09-22', '/contacts/scans/scan-09-22'])
  })

  it('marks the audience being viewed as active', () => {
    const { result } = renderTracker('demo', 'contacts', '/demo/contacts')

    expect(result.current.audienceLinks.map((link) => link.isActive)).toEqual([false, false, true])
  })

  it('offers all audiences together first, then followers, then connections', () => {
    const { result } = renderTracker('live', 'followers', '/followers')
    expect(result.current.audienceLinks.map((link) => link.label)).toEqual(['All', 'Followers', 'Connections'])
  })

  it('keeps the list being viewed when switching to all audiences together', () => {
    const { result } = renderTracker('live', 'contacts', '/contacts/hiring')
    expect(result.current.audienceLinks[0].to).toBe('/all/hiring')
  })

  it('opens the dashboard when switching to all audiences from a page they do not have', () => {
    const { result } = renderTracker('demo', 'followers', '/demo/followers/trends')
    expect(result.current.audienceLinks[0].to).toBe('/demo/all')
  })

  it('keeps the dashboard when switching to all audiences from the dashboard', () => {
    const { result } = renderTracker('live', 'contacts', '/contacts')
    expect(result.current.audienceLinks[0].to).toBe('/all')
  })

  it('keeps the dashboard when switching from all audiences to one', () => {
    const { result } = renderTracker('demo', 'all', '/demo/all')
    expect(result.current.audienceLinks.map((link) => link.to)).toEqual(['/demo/all', '/demo/followers', '/demo/contacts'])
  })

  it('keeps the list being viewed when switching from all audiences to one', () => {
    const { result } = renderTracker('live', 'all', '/all/hiring')
    expect(result.current.audienceLinks.map((link) => [link.to, link.isActive])).toEqual([
      ['/all/hiring', true],
      ['/followers/hiring', false],
      ['/contacts/hiring', false],
    ])
  })

  it('shows how many followers and contacts there are', async () => {
    vi.stubGlobal(
      'fetch',
      liveApiWithListSizes({
        all: { peopleCount: 1_500, latestScanDate: '2026-09-22' },
        followers: { peopleCount: 1_204, latestScanDate: '2026-09-22' },
        contacts: { peopleCount: 387, latestScanDate: '2026-09-21' },
      }),
    )
    const { result } = renderTracker('live', 'followers', '/followers')

    await waitFor(() => expect(result.current.audienceLinks.map((link) => link.detail)).toEqual(['1,500', '1,204', '387']))
  })

  it('shows 0 for a list that has never been scanned', async () => {
    vi.stubGlobal(
      'fetch',
      liveApiWithListSizes({
        all: { peopleCount: 1_204, latestScanDate: '2026-09-22' },
        followers: { peopleCount: 1_204, latestScanDate: '2026-09-22' },
        contacts: { peopleCount: 0, latestScanDate: null },
      }),
    )
    const { result } = renderTracker('live', 'followers', '/followers')

    await waitFor(() => expect(result.current.audienceLinks.map((link) => link.detail)).toEqual(['1,204', '1,204', '0']))
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

  it('describes both demo samples when viewing all audiences together', () => {
    const { result } = renderTracker('demo', 'all', '/demo/all/open-to-work')
    expect(result.current.demoSampleDescription).toMatch(/^\d+ fictional followers and \d+ fictional contacts/)
  })

  it('reads the demo data for the audience being viewed', () => {
    const { result } = renderTracker('demo', 'contacts', '/demo/contacts')

    expect(result.current.environment).toMatchObject({ isDemo: true, audience: 'contacts', routeBase: '/demo/contacts' })
  })
})
