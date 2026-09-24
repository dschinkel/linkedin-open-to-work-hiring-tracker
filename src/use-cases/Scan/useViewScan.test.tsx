// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import type { AddScreenshotsResult, ProcessingResult, ScanDetail, ScanSummary } from '@contracts/api'
import { hiringSummary, insideTracker, openToWorkSummary, scanDetail, scanSummary } from '@/test-support/trackerFixtures'
import type { ScanRepository } from './ScanRepository'
import { useViewScan } from './useViewScan'

function scanRepository(detail: ScanDetail, reprocess: () => Promise<ProcessingResult> = async () => ({ message: 'Reprocessed 42 screenshots.' })) {
  const scansAskedFor: string[] = []
  const scansReprocessed: string[] = []
  const repository: ScanRepository = {
    history: async () => [] as ScanSummary[],
    detail: async (scanId) => {
      scansAskedFor.push(scanId)
      return detail
    },
    reprocess: async (scanId) => {
      scansReprocessed.push(scanId)
      return reprocess()
    },
    addScreenshots: async () => ({}) as AddScreenshotsResult,
    people: async () => ({ scanId: '', scanDate: '', people: [] }),
  }
  return { repository, scansAskedFor, scansReprocessed }
}

const onScanPage = { mode: 'demo' as const, audience: 'followers' as const, path: '/demo/followers/scans/scan-09-22', routePath: '/demo/followers/scans/:scanId' }

async function readyScan(repository: ScanRepository) {
  const rendered = renderHook(() => useViewScan(repository), { wrapper: insideTracker(onScanPage) })
  await waitFor(() => expect(rendered.result.current.status).toBe('ready'))
  return rendered
}

describe('one scan in detail', () => {
  it('loads the scan named in the address', async () => {
    const { repository, scansAskedFor } = scanRepository(scanDetail())

    await readyScan(repository)

    expect(scansAskedFor).toEqual(['scan-09-22'])
  })

  it('titles the page with the scan date', async () => {
    const { repository } = scanRepository(scanDetail({ summary: scanSummary({ scanDate: '2026-09-22' }) }))

    const { result } = await readyScan(repository)

    expect(result.current.title).toBe('Sep 22, 2026')
  })

  it('summarizes screenshots, unique people, and duplicates removed', async () => {
    const { repository } = scanRepository(scanDetail({ summary: scanSummary({ peopleCount: 1_204, duplicateCount: 37 }) }))

    const { result } = await readyScan(repository)

    expect(result.current.screenshotSummary).toMatch(/2 screenshots.*1,204.*37/)
  })

  it('shows how many people in a screenshot were uncertain', async () => {
    const { repository } = scanRepository(scanDetail())

    const { result } = await readyScan(repository)

    expect(result.current.screenshots[0]).toMatchObject({ fileName: 'followers-page-1.png', result: '12 people / 2 uncertain' })
  })

  it('shows only the people count for a screenshot without uncertain cards', async () => {
    const { repository } = scanRepository(scanDetail())

    const { result } = await readyScan(repository)

    expect(result.current.screenshots[1].result).toBe('9 people')
  })

  it('shows people who removed the open-to-work frame as a negative count', async () => {
    const { repository } = scanRepository(scanDetail({ summary: scanSummary({ openToWork: openToWorkSummary({ removed: 7 }) }) }))

    const { result } = await readyScan(repository)

    expect(result.current.openToWorkRows).toContainEqual({ label: 'Removed open', value: '-7' })
  })

  it('names how many people the matched rate is based on', async () => {
    const { repository } = scanRepository(scanDetail({ summary: scanSummary({ openToWork: openToWorkSummary({ matchedCount: 1_150, matchedRate: 9.6 }) }) }))

    const { result } = await readyScan(repository)

    expect(result.current.openToWorkRows).toContainEqual({ label: 'Matched rate (1150 matched)', value: '9.6%' })
  })

  it('shows the net change in hiring with its sign', async () => {
    const { repository } = scanRepository(scanDetail({ summary: scanSummary({ hiring: hiringSummary({ net: -2 }) }) }))

    const { result } = await readyScan(repository)

    expect(result.current.hiringRows).toContainEqual({ label: 'Net hiring', value: '-2' })
  })

  it('links back to all scans of the same tracker', async () => {
    const { repository } = scanRepository(scanDetail())

    const { result } = await readyScan(repository)

    expect(result.current.allScansHref).toBe('/demo/followers/scans')
  })

  it('reprocesses the scan being viewed', async () => {
    const { repository, scansReprocessed } = scanRepository(scanDetail())
    const { result } = await readyScan(repository)

    act(() => result.current.reprocess())

    await waitFor(() => expect(scansReprocessed).toEqual(['scan-09-22']))
  })

  it('reports what reprocessing did', async () => {
    const { repository } = scanRepository(scanDetail())
    const { result } = await readyScan(repository)

    act(() => result.current.reprocess())

    await waitFor(() => expect(result.current.reprocessMessage).toBe('Reprocessed 42 screenshots.'))
  })

  it('explains why reprocessing failed', async () => {
    const { repository } = scanRepository(scanDetail(), async () => {
      throw new Error('Screenshots were archived')
    })
    const { result } = await readyScan(repository)

    act(() => result.current.reprocess())

    await waitFor(() => expect(result.current.reprocessMessage).toBe('Screenshots were archived'))
  })
})
