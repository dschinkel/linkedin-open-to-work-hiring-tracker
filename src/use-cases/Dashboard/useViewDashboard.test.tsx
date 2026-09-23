// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react'
import type { Dashboard } from '@contracts/api'
import { dashboard, insideTracker, pendingAnswer, scanSummary } from '@/test-support/trackerFixtures'
import type { DashboardRepository } from './DashboardRepository'
import { useViewDashboard } from './useViewDashboard'

function repositoryReturning(latest: Dashboard): DashboardRepository {
  return { latest: async () => latest }
}

function repositoryFailingWith(message: string): DashboardRepository {
  return {
    latest: async () => {
      throw new Error(message)
    },
  }
}

async function readyDashboard(repository: DashboardRepository, wrapper = insideTracker()) {
  const { result } = renderHook(() => useViewDashboard(repository), { wrapper })
  await waitFor(() => expect(result.current.status).toBe('ready'))
  return result.current
}

describe('dashboard at a glance', () => {
  it('shows it is loading while the latest scan is on its way', () => {
    const { result } = renderHook(() => useViewDashboard({ latest: () => pendingAnswer<Dashboard>().promise }), { wrapper: insideTracker() })

    expect(result.current.status).toBe('loading')
  })

  it('explains why the dashboard could not load', async () => {
    const { result } = renderHook(() => useViewDashboard(repositoryFailingWith('Tracker database is locked')), { wrapper: insideTracker() })

    await waitFor(() => expect(result.current.errorMessage).toBe('Tracker database is locked'))
  })

  it('dates the latest scan', async () => {
    const view = await readyDashboard(repositoryReturning(dashboard({ latestScan: scanSummary({ scanDate: '2026-09-22' }) })))

    expect(view.latestScanLabel).toContain('Sep 22, 2026')
  })

  it('shows how many people the latest scan sampled', async () => {
    const view = await readyDashboard(repositoryReturning(dashboard({ latestScan: scanSummary({ peopleCount: 1_204 }) })))

    expect(view.sampleLabel).toContain('1,204')
  })

  it('shows how many scans exist in total', async () => {
    const view = await readyDashboard(repositoryReturning(dashboard({ scanCount: 1_180 })))

    expect(view.sampleLabel).toContain('1,180')
  })

  it('shows the open-to-work and hiring tiles for the latest scan', async () => {
    const view = await readyDashboard(repositoryReturning(dashboard()))

    expect([view.openToWorkTiles.length, view.hiringTiles.length]).toEqual([9, 6])
  })

  it('shows how many people are hiring at how many companies', async () => {
    const view = await readyDashboard(repositoryReturning(dashboard({ whoIsHiring: { peopleCount: 1_046, companyCount: 312, preview: [] } })))

    expect(view.whoIsHiringHeadline).toMatch(/1,046.*312/)
  })

  it('previews the people who are hiring', async () => {
    const view = await readyDashboard(repositoryReturning(dashboard()))

    expect(view.whoIsHiringPeople.map((person) => person.name)).toEqual(['Mike Brown'])
  })

  it('says nobody is hiring when no one wears the frame', async () => {
    const view = await readyDashboard(repositoryReturning(dashboard({ whoIsHiring: { peopleCount: 0, companyCount: 0, preview: [] } })))

    expect(view.showNoHiringPeople).toBe(true)
  })

  it('shows how trustworthy the latest scan is', async () => {
    const view = await readyDashboard(repositoryReturning(dashboard()))

    expect(view.qualitySections).toHaveLength(4)
  })

  it('leaves out scan quality when none was recorded', async () => {
    const view = await readyDashboard(repositoryReturning(dashboard({ latestQuality: null })))

    expect(view.qualitySections).toEqual([])
  })

  it('shows how many screenshots are waiting in the inbox', async () => {
    const view = await readyDashboard(repositoryReturning(dashboard({ inboxWaitingCount: 3 })))

    expect(view).toMatchObject({ showInboxNote: true, inboxNote: expect.stringContaining('3 screenshots') })
  })

  it('speaks of a single waiting screenshot in the singular', async () => {
    const view = await readyDashboard(repositoryReturning(dashboard({ inboxWaitingCount: 1 })))

    expect(view.inboxNote).toContain('1 screenshot is')
  })

  it('hides the inbox note when nothing is waiting', async () => {
    const view = await readyDashboard(repositoryReturning(dashboard({ inboxWaitingCount: 0 })))

    expect(view.showInboxNote).toBe(false)
  })

  it('shows screenshots waiting in the inbox even before the first scan', async () => {
    const view = await readyDashboard(repositoryReturning(dashboard({ scanCount: 0, latestScan: null, latestQuality: null, inboxWaitingCount: 5 })))

    expect(view).toMatchObject({ hasScans: false, showInboxNote: true })
  })

  it('links to the hiring page of the same tracker', async () => {
    const view = await readyDashboard(repositoryReturning(dashboard()), insideTracker({ mode: 'demo', audience: 'contacts' }))

    expect(view.hiringHref).toBe('/demo/contacts/hiring')
  })
})
