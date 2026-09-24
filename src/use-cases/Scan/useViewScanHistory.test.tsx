// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { useLocation } from 'react-router-dom'
import type { AddScreenshotsResult, ProcessingResult, ScanDetail, ScanSummary, TimeWindow } from '@contracts/api'
import { insideTracker, openToWorkSummary, scanSummary } from '@/test-support/trackerFixtures'
import type { ScanRepository } from './ScanRepository'
import { useViewScanHistory } from './useViewScanHistory'

const september20 = scanSummary({ id: 'scan-09-20', scanDate: '2026-09-20', peopleCount: 1_190 })
const september21 = scanSummary({ id: 'scan-09-21', scanDate: '2026-09-21', peopleCount: 1_251 })
const september22 = scanSummary({ id: 'scan-09-22', scanDate: '2026-09-22', peopleCount: 1_204, openToWork: openToWorkSummary({ rate: 12.46, removed: 7 }) })

function historyRepository(scans: ScanSummary[]) {
  const windowsAskedFor: TimeWindow[] = []
  const repository: ScanRepository = {
    history: async (window) => {
      windowsAskedFor.push(window)
      return scans
    },
    detail: async () => ({}) as ScanDetail,
    reprocess: async () => ({}) as ProcessingResult,
    people: async () => ({ scanId: '', scanDate: '', people: [] }),
    addScreenshots: async () => ({}) as AddScreenshotsResult,
  }
  return { repository, windowsAskedFor }
}

function renderHistory(scans: ScanSummary[], wrapper = insideTracker()) {
  const { repository, windowsAskedFor } = historyRepository(scans)
  const rendered = renderHook(() => ({ history: useViewScanHistory(repository), location: useLocation() }), { wrapper })
  return { ...rendered, windowsAskedFor }
}

async function readyHistory(scans: ScanSummary[]) {
  const rendered = renderHistory(scans)
  await waitFor(() => expect(rendered.result.current.history.status).toBe('ready'))
  return rendered
}

describe('daily scan history', () => {
  it('lists the newest scan first', async () => {
    const { result } = await readyHistory([september20, september22, september21])

    expect(result.current.history.rows.map((row) => row.id)).toEqual(['scan-09-22', 'scan-09-21', 'scan-09-20'])
  })

  it('shows the last 30 days of scans at first', async () => {
    const { windowsAskedFor } = await readyHistory([september22])

    expect(windowsAskedFor).toEqual(['30d'])
  })

  it('shows scans from a longer time window when chosen', async () => {
    const { result, windowsAskedFor } = await readyHistory([september22])

    act(() => result.current.history.chooseTimeWindow('1y'))

    await waitFor(() => expect(windowsAskedFor).toEqual(['30d', '1y']))
  })

  it('lists the oldest scan first after sorting by date again', async () => {
    const { result } = await readyHistory([september20, september22, september21])

    act(() => result.current.history.sortBy('date'))

    expect(result.current.history.rows.map((row) => row.id)).toEqual(['scan-09-20', 'scan-09-21', 'scan-09-22'])
  })

  it('puts the largest sample first when sorting by people sampled', async () => {
    const { result } = await readyHistory([september20, september22, september21])

    act(() => result.current.history.sortBy('sampled'))

    expect(result.current.history.rows.map((row) => row.id)).toEqual(['scan-09-21', 'scan-09-22', 'scan-09-20'])
  })

  it('shows each scan with its formatted date, sample size, and open rate', async () => {
    const { result } = await readyHistory([september22])

    expect(result.current.history.rows[0].cells).toMatchObject({ date: { text: 'Sep 22, 2026' }, sampled: { text: '1,204' }, openRate: { text: '12.5%' } })
  })

  it('shows people who removed the frame as a negative count', async () => {
    const { result } = await readyHistory([september22])

    expect(result.current.history.rows[0].cells.removedOpen.text).toBe('-7')
  })

  it('switches to hiring metrics when the hiring columns are chosen', async () => {
    const { result } = await readyHistory([september22])

    act(() => result.current.history.chooseColumnSet('hiring'))

    expect(result.current.history.columns.map((column) => column.key)).toEqual(['date', 'sampled', 'hiring', 'hiringRate', 'newHiring', 'removedHiring', 'hiringNet', 'companies'])
  })

  it('says there are no scans when the time window is empty', async () => {
    const { result } = await readyHistory([])

    expect(result.current.history).toMatchObject({ hasScans: false, showNoScans: true })
  })

  it('opens a scan within the same tracker', async () => {
    const { repository } = historyRepository([september22])
    const { result } = renderHook(() => ({ history: useViewScanHistory(repository), location: useLocation() }), {
      wrapper: insideTracker({ mode: 'demo', audience: 'contacts', path: '/demo/contacts/scans' }),
    })

    act(() => result.current.history.openScan('scan-09-22'))

    expect(result.current.location.pathname).toBe('/demo/contacts/scans/scan-09-22')
  })
})
