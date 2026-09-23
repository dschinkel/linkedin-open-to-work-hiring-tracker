// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import type { TimeWindow, Trends } from '@contracts/api'
import { insideTracker, trendPoint, trends } from '@/test-support/trackerFixtures'
import type { TrendRepository } from './TrendRepository'
import { useViewTrends } from './useViewTrends'

function trendRepositoryReturning(answer: Trends) {
  const windowsAskedFor: TimeWindow[] = []
  const repository: TrendRepository = {
    trends: async (window) => {
      windowsAskedFor.push(window)
      return answer
    },
    titleTrends: async () => Promise.reject(new Error('not used here')),
  }
  return { repository, windowsAskedFor }
}

async function readyTrends(answer: Trends) {
  const { repository, windowsAskedFor } = trendRepositoryReturning(answer)
  const rendered = renderHook(() => useViewTrends(repository), { wrapper: insideTracker() })
  await waitFor(() => expect(rendered.result.current.status).toBe('ready'))
  return { ...rendered, windowsAskedFor }
}

describe('trends', () => {
  it('shows the last 90 days at first', async () => {
    const { windowsAskedFor } = await readyTrends(trends())

    expect(windowsAskedFor).toEqual(['90d'])
  })

  it('shows another time window when chosen', async () => {
    const { result, windowsAskedFor } = await readyTrends(trends())

    act(() => result.current.chooseTimeWindow('6m'))

    await waitFor(() => expect(windowsAskedFor).toEqual(['90d', '6m']))
  })

  it('draws a trend once there are two scans', async () => {
    const { result } = await readyTrends(trends())

    expect(result.current).toMatchObject({ hasTrend: true, showTrendPending: false })
  })

  it('waits for a second scan before drawing a trend', async () => {
    const { result } = await readyTrends(trends({ points: [trendPoint()] }))

    expect(result.current).toMatchObject({ hasTrend: false, showTrendPending: true })
  })

  it('shows each moving average with its rate and change', async () => {
    const { result } = await readyTrends(trends())

    expect(result.current.movingAverageRows[1].cells).toEqual({ metric: { text: '30-day average' }, rate: { text: '8.9%' }, change: { text: '-0.3pp' } })
  })

  it('totals people who added and removed the frame', async () => {
    const { result } = await readyTrends(trends({ flowTotals: { addedOpen: 1_204, removedOpen: 963, entryExitRatio: 1.2502 } }))

    expect(result.current.flowTiles.map((tile) => tile.value)).toEqual(['1,204', '963', '1.25'])
  })

  it('shows the median time people keep the frame', async () => {
    const { result } = await readyTrends(trends())

    expect(result.current.durationTiles[0].value).toBe('41 days')
  })

  it('shows the median duration as not available when it cannot be computed', async () => {
    const { result } = await readyTrends(trends({ durations: { completedEpisodes: 1, medianDays: null, buckets: [] } }))

    expect(result.current.durationTiles[0].value).toBe('—')
  })

  it('shows each duration bucket as a whole percentage', async () => {
    const { result } = await readyTrends(trends())

    expect(result.current.durationBuckets.map((bucket) => bucket.shareLabel)).toEqual(['33%', '47%', '20%'])
  })

  it('waits for a completed episode before showing durations', async () => {
    const { result } = await readyTrends(trends({ durations: { completedEpisodes: 0, medianDays: null, buckets: [] } }))

    expect(result.current).toMatchObject({ hasDurations: false, showDurationPending: true })
  })
})
