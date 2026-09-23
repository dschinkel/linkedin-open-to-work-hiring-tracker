import type { ScanSummary, TimeWindow, TrendPoint, Trends } from '../../../contracts/api.ts'
import { observedDurations } from '../domain/Durations.ts'
import { movingAverageAt, movingAverageTable } from '../domain/MovingAverages.ts'
import { entryExitRatio } from '../domain/Rates.ts'
import { withinWindow } from '../domain/TimeWindow.ts'
import type { TrackerPorts } from '../domain/TrackerAnalytics.ts'

/** Rates, averages, flows, and observed durations over a time window. */
export const viewTrends = ({ analytics }: TrackerPorts) => ({
  viewTrends: (window: TimeWindow): Trends => {
    const { index, timeline } = analytics()
    const inWindow = withinWindow(timeline, window)
    const addedOpen = sum(inWindow.map((summary) => summary.openToWork.added))
    const removedOpen = sum(inWindow.map((summary) => summary.openToWork.removed))
    return {
      points: inWindow.map((summary) => toTrendPoint(summary, timeline)),
      movingAverages: movingAverageTable(timeline),
      flowTotals: { addedOpen, removedOpen, entryExitRatio: entryExitRatio(addedOpen, removedOpen) },
      durations: observedDurations(index),
    }
  },
})

function toTrendPoint(summary: ScanSummary, timeline: ScanSummary[]): TrendPoint {
  return {
    scanDate: summary.scanDate,
    openRate: summary.openToWork.rate,
    openRateSevenDayAverage: movingAverageAt(timeline, summary.scanDate, 7),
    matchedOpenRate: summary.openToWork.matchedRate,
    addedOpen: summary.openToWork.added,
    removedOpen: summary.openToWork.removed,
    netOpen: summary.openToWork.net,
    entryRate: summary.openToWork.entryRate,
    removalRate: summary.openToWork.removalRate,
    hiringRate: summary.hiring.rate,
    addedHiring: summary.hiring.added,
    removedHiring: summary.hiring.removed,
    netHiring: summary.hiring.net,
  }
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}
