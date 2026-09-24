// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react'
import type { AllDashboard } from '@contracts/api'
import { allDashboard, insideTracker, pendingAnswer } from '@/test-support/trackerFixtures'
import type { AllDashboardRepository } from './AllDashboardRepository'
import { useViewAllDashboard } from './useViewAllDashboard'

function repositoryReturning(latest: AllDashboard): AllDashboardRepository {
  return { latest: async () => latest }
}

function repositoryFailingWith(message: string): AllDashboardRepository {
  return {
    latest: async () => {
      throw new Error(message)
    },
  }
}

async function readyDashboard(latest: AllDashboard) {
  const { result } = renderHook(() => useViewAllDashboard(repositoryReturning(latest)), { wrapper: insideTracker({ mode: 'demo', audience: 'all' }) })
  await waitFor(() => expect(result.current.status).toBe('ready'))
  return result.current
}

describe('dashboard of followers and connections together', () => {
  it('shows it is loading while the latest scans are on their way', () => {
    const { result } = renderHook(() => useViewAllDashboard({ latest: () => pendingAnswer<AllDashboard>().promise }), { wrapper: insideTracker({ audience: 'all' }) })
    expect(result.current.status).toBe('loading')
  })

  it('explains why the dashboard could not load', async () => {
    const { result } = renderHook(() => useViewAllDashboard(repositoryFailingWith('Tracker database is locked')), { wrapper: insideTracker({ audience: 'all' }) })
    await waitFor(() => expect(result.current.errorMessage).toBe('Tracker database is locked'))
  })

  it('dates the latest scan of each audience', async () => {
    const view = await readyDashboard(allDashboard())
    expect([view.latestScanLabel.includes('Sep 22, 2026'), view.latestScanLabel.includes('Sep 21, 2026')]).toEqual([true, true])
  })

  it('says which audience has not been scanned yet', async () => {
    const view = await readyDashboard(allDashboard({ latestScanDates: { followers: '2026-09-22', contacts: null } }))
    expect(view.latestScanLabel).toMatch(/Connections not scanned yet/)
  })

  it('shows how many different people the latest scans hold together', async () => {
    const view = await readyDashboard(allDashboard({ peopleCount: 1_500 }))
    expect(view.sampledCount).toBe('1,500')
  })

  it('breaks the people down by audience, counting those in both', async () => {
    const view = await readyDashboard(allDashboard({ peopleByAudience: { followers: 994, contacts: 592, both: 86 } }))
    expect(view.audienceBreakdown).toBe('Followers 994 · Connections 592 · in both 86')
  })

  it('rates open to work across both audiences', async () => {
    const view = await readyDashboard(allDashboard({ openToWork: { open: 140, notOpen: 1_352, uncertain: 8, rate: 9.3834 } }))

    expect(view.openToWorkTiles.slice(0, 2).map((tile) => [tile.value, tile.hint])).toEqual([
      ['9.4%', '8 unclear photos not counted'],
      ['140', 'of 1,492 read'],
    ])
  })

  it('rates hiring across both audiences', async () => {
    const view = await readyDashboard(allDashboard({ hiring: { hiring: 61, notHiring: 1_431, uncertain: 0, rate: 4.0885, companyCount: 44 } }))
    expect(view.hiringTiles.slice(0, 3).map((tile) => tile.value)).toEqual(['4.1%', '61', '44'])
  })

  it('leaves open to work changes over time to a single audience', async () => {
    const view = await readyDashboard(allDashboard())
    expect(view.openToWorkTiles.slice(2).map((tile) => tile.value)).toEqual(['—', '—', '—', '—', '—', '—', '—'])
  })

  it('leaves hiring changes over time to a single audience', async () => {
    const view = await readyDashboard(allDashboard())
    expect(view.hiringTiles.slice(3).map((tile) => tile.value)).toEqual(['—', '—', '—'])
  })

  it('links the counts to the lists of both audiences together', async () => {
    const view = await readyDashboard(allDashboard())
    expect([view.openToWorkTiles[1].href, view.hiringTiles[1].href, view.hiringHref]).toEqual(['/demo/all/open-to-work', '/demo/all/hiring', '/demo/all/hiring'])
  })

  it('previews the people who are hiring', async () => {
    const view = await readyDashboard(allDashboard())
    expect(view.whoIsHiringPeople.map((person) => person.name)).toEqual(['Mike Brown'])
  })

  it('says nobody is hiring when no one wears the frame', async () => {
    const view = await readyDashboard(allDashboard({ whoIsHiring: { peopleCount: 0, companyCount: 0, preview: [] } }))
    expect(view.showNoHiringPeople).toBe(true)
  })

  it('shows how trustworthy the latest scans are', async () => {
    const view = await readyDashboard(allDashboard())
    expect(view.qualitySections).toHaveLength(4)
  })

  it('has nothing to show before either audience is scanned', async () => {
    const view = await readyDashboard(allDashboard({ latestScanDates: { followers: null, contacts: null }, peopleCount: 0, latestQuality: null }))
    expect([view.hasScans, view.qualitySections]).toEqual([false, []])
  })
})
