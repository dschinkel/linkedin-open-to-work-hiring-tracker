// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import type { TimeWindow, Trends } from '@contracts/api'
import { insideTracker, trendPoint, trends } from '@/test-support/trackerFixtures'
import type { TrendRepository } from './TrendRepository'
import { useViewOpenToWorkTrend } from './useViewOpenToWorkTrend'

function trendRepositoryReturning(answer: Trends) {
  const windowsAskedFor: TimeWindow[] = []
  const repository: TrendRepository = {
    trends: async (window) => {
      windowsAskedFor.push(window)
      return answer
    },
  }
  return { repository, windowsAskedFor }
}

async function readyTrend(answer: Trends) {
  const { repository, windowsAskedFor } = trendRepositoryReturning(answer)
  const rendered = renderHook(() => useViewOpenToWorkTrend(repository), { wrapper: insideTracker() })
  await waitFor(() => expect(rendered.result.current.status).toBe('ready'))
  return { ...rendered, windowsAskedFor }
}

describe('open-to-work trend on the dashboard', () => {
  it('shows the last 90 days at first', async () => {
    const { windowsAskedFor } = await readyTrend(trends())

    expect(windowsAskedFor).toEqual(['90d'])
  })

  it('shows another time window when chosen', async () => {
    const { result, windowsAskedFor } = await readyTrend(trends())

    act(() => result.current.chooseTimeWindow('7d'))

    await waitFor(() => expect(windowsAskedFor).toEqual(['90d', '7d']))
  })

  it('charts every scan in the window', async () => {
    const { result } = await readyTrend(trends())

    expect(result.current.points.map((point) => point.scanDate)).toEqual(['2026-09-21', '2026-09-22'])
  })

  it('draws a trend once there are two scans', async () => {
    const { result } = await readyTrend(trends())

    expect(result.current).toMatchObject({ hasTrend: true, showTrendPending: false })
  })

  it('waits for a second scan before drawing a trend', async () => {
    const { result } = await readyTrend(trends({ points: [trendPoint()] }))

    expect(result.current).toMatchObject({ hasTrend: false, showTrendPending: true })
  })
})
