import type { MovingAverage, ScanSummary } from '../../../contracts/api.ts'
import { average, percentagePointChange } from './Rates.ts'
import { addDays } from '../../shared/domain/ScanDate.ts'

const averagedWindows = [
  { label: '7-day avg', days: 7 },
  { label: '30-day avg', days: 30 },
  { label: '90-day avg', days: 90 },
]

/**
 * Averages the rates of scans actually taken in the trailing window (endDate − days, endDate].
 * Missing dates are skipped rather than filled in.
 */
export function movingAverageAt(summaries: ScanSummary[], endDate: string, days: number): number | null {
  const startExclusive = addDays(endDate, -days)
  const rates = summaries
    .filter((summary) => summary.scanDate > startExclusive && summary.scanDate <= endDate)
    .map((summary) => summary.openToWork.rate)
    .filter((rate): rate is number => rate !== null)
  return average(rates)
}

/** "Today" is the latest scan versus the scan before it; each average is compared with itself one window earlier. */
export function movingAverageTable(summaries: ScanSummary[]): MovingAverage[] {
  const latest = summaries.at(-1)
  if (!latest) return []
  return [latestScanRow(summaries), ...averagedWindows.map((window) => averageRow(summaries, latest.scanDate, window))]
}

function latestScanRow(summaries: ScanSummary[]): MovingAverage {
  const rate = summaries.at(-1)?.openToWork.rate ?? null
  const previousRate = summaries.at(-2)?.openToWork.rate ?? null
  return { label: 'Latest scan', rate, changePp: percentagePointChange(rate, previousRate) }
}

function averageRow(summaries: ScanSummary[], latestDate: string, window: { label: string; days: number }): MovingAverage {
  const rate = movingAverageAt(summaries, latestDate, window.days)
  const earlier = movingAverageAt(summaries, addDays(latestDate, -window.days), window.days)
  return { label: window.label, rate, changePp: percentagePointChange(rate, earlier) }
}
