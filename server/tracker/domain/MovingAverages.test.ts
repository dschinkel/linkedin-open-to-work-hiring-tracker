import type { ScanSummary } from '../../../contracts/api.ts'
import { movingAverageAt } from './MovingAverages.ts'

function scanWithRate(scanDate: string, rate: number): ScanSummary {
  return { scanDate, openToWork: { rate } } as ScanSummary
}

describe('moving averages', () => {
  it('average only scans actually taken inside the window', () => {
    const scans = [scanWithRate('2026-09-01', 50), scanWithRate('2026-09-20', 10), scanWithRate('2026-09-22', 20)]

    expect(movingAverageAt(scans, '2026-09-22', 7)).toBe(15)
  })
})
