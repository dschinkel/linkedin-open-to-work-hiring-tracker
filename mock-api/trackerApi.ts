import type {
  CompanyHiring,
  Dashboard,
  HiringPeopleQuery,
  HiringPerson,
  ProcessingResult,
  ScanDetail,
  ScanHistory,
  ScanSummary,
  Settings,
  TimeWindow,
  Trends,
  TrendPoint,
} from '../contracts/api.ts'
import { observedDurations } from './domain/durations.ts'
import { aggregateHiringCompanies, filterHiringPeople, listHiringPeople } from './domain/hiringPeople.ts'
import { movingAverageAt, movingAverageTable } from './domain/movingAverages.ts'
import type { Network } from './domain/observation.ts'
import { indexNetwork, type NetworkIndex } from './domain/networkIndex.ts'
import { entryExitRatio } from './domain/rates.ts'
import { scanQuality } from './domain/scanQuality.ts'
import { withinWindow } from './domain/timeWindow.ts'
import { buildTimeline } from './domain/timeline.ts'

const whoIsHiringPreviewSize = 6

export interface TrackerApi {
  dashboard: () => Dashboard
  scanHistory: (window: TimeWindow) => ScanHistory
  scanDetail: (scanId: string) => ScanDetail | null
  trends: (window: TimeWindow) => Trends
  hiringPeople: (query: HiringPeopleQuery) => { people: HiringPerson[] }
  hiringCompanies: () => CompanyHiring
  settings: () => Settings
  saveSettings: (settings: Settings) => Settings
  analyzeNewScreenshots: () => ProcessingResult
  reprocessScan: (scanId: string) => ProcessingResult | null
}

/** Serves the Koa API contract from an in-memory network, computed once. */
export function createTrackerApi(network: Network, initialSettings: Settings): TrackerApi {
  const index = indexNetwork(network)
  const timeline = buildTimeline(index)
  const hiringPeople = listHiringPeople(index)
  let settings = initialSettings

  return {
    dashboard: () => dashboard(index, timeline, hiringPeople),
    scanHistory: (window) => ({ scans: withinWindow(timeline, window).reverse() }),
    scanDetail: (scanId) => scanDetail(scanId, index, timeline),
    trends: (window) => trends(index, timeline, window),
    hiringPeople: (query) => ({ people: filterHiringPeople(hiringPeople, query) }),
    hiringCompanies: () => aggregateHiringCompanies(hiringPeople),
    settings: () => settings,
    saveSettings: (next) => (settings = next),
    analyzeNewScreenshots: () => ({ message: `No new screenshots found in ${settings.inboxDirectory}.` }),
    reprocessScan: (scanId) => (timeline.some((summary) => summary.id === scanId) ? { message: 'Scan reprocessed. Results unchanged.' } : null),
  }
}

function dashboard(index: NetworkIndex, timeline: ScanSummary[], hiringPeople: HiringPerson[]): Dashboard {
  const latestScan = index.scansInOrder.at(-1)
  const currentlyHiring = filterHiringPeople(hiringPeople, { search: '', company: '', status: 'current', companyKnown: 'all', sort: 'lastSeen' })
  return {
    scanCount: timeline.length,
    latestScan: timeline.at(-1) ?? null,
    latestQuality: latestScan ? scanQuality(latestScan, index) : null,
    whoIsHiring: {
      peopleCount: currentlyHiring.length,
      companyCount: aggregateHiringCompanies(hiringPeople).companies.length,
      preview: currentlyHiring.slice(0, whoIsHiringPreviewSize),
    },
  }
}

function scanDetail(scanId: string, index: NetworkIndex, timeline: ScanSummary[]): ScanDetail | null {
  const scan = index.scansInOrder.find((candidate) => candidate.id === scanId)
  const summary = timeline.find((candidate) => candidate.id === scanId)
  if (!scan || !summary) return null
  return { summary, quality: scanQuality(scan, index), screenshots: scan.screenshots }
}

function trends(index: NetworkIndex, timeline: ScanSummary[], window: TimeWindow): Trends {
  const inWindow = withinWindow(timeline, window)
  const addedOpen = sum(inWindow.map((summary) => summary.openToWork.added))
  const removedOpen = sum(inWindow.map((summary) => summary.openToWork.removed))
  return {
    points: inWindow.map((summary) => toTrendPoint(summary, timeline)),
    movingAverages: movingAverageTable(timeline),
    flowTotals: { addedOpen, removedOpen, entryExitRatio: entryExitRatio(addedOpen, removedOpen) },
    durations: observedDurations(index),
  }
}

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
