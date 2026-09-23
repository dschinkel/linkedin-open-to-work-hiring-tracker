import type {
  AddScreenshotsRequest,
  AddScreenshotsResult,
  CompanyHiring,
  Dashboard,
  DepartedPeople,
  NetworkSize,
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
import { listDepartedPeople } from './domain/departedPeople.ts'
import { observedDurations } from './domain/durations.ts'
import { networkSize } from './domain/networkSize.ts'
import { aggregateHiringCompanies, filterHiringPeople, listHiringPeople } from './domain/hiringPeople.ts'
import { movingAverageAt, movingAverageTable } from './domain/movingAverages.ts'
import { indexNetwork, type NetworkIndex } from './domain/networkIndex.ts'
import { entryExitRatio } from './domain/rates.ts'
import { scanQuality } from './domain/scanQuality.ts'
import { withinWindow } from './domain/timeWindow.ts'
import { buildTimeline } from './domain/timeline.ts'
import { addScreenshots, type ScreenshotInbox } from './screenshotInbox.ts'
import type { TrackerStore } from './trackerStore.ts'

const whoIsHiringPreviewSize = 6

export interface TrackerApi {
  dashboard: () => Dashboard
  scanHistory: (window: TimeWindow) => ScanHistory
  scanDetail: (scanId: string) => ScanDetail | null
  trends: (window: TimeWindow) => Trends
  hiringPeople: (query: HiringPeopleQuery) => { people: HiringPerson[] }
  hiringCompanies: () => CompanyHiring
  departedPeople: () => DepartedPeople
  networkSize: () => NetworkSize
  settings: () => Settings
  saveSettings: (settings: Settings) => Settings
  reprocessScan: (scanId: string) => ProcessingResult | null
  addScreenshots: (request: AddScreenshotsRequest) => Promise<AddScreenshotsResult>
}

export interface TrackerApiOptions {
  /** Runs right after screenshots are added and returns a status message. Until the analyzer exists, it says so. */
  analyzeNewScreenshots?: () => Promise<string>
  /** Where dropped screenshots are stored. Without one (the demo), nothing is saved. */
  screenshotInbox?: ScreenshotInbox
}

interface Analytics {
  index: NetworkIndex
  timeline: ScanSummary[]
  hiringPeople: HiringPerson[]
}

/**
 * Serves the Koa API contract from whatever the store holds. Analytics are recomputed whenever the
 * stored data changes (a new scan, a new screenshot), so every request reflects what is saved.
 */
export function createTrackerApi(store: TrackerStore, options: TrackerApiOptions): TrackerApi {
  const analytics = cachedAnalytics(store)

  return {
    dashboard: () => dashboard(analytics(), store.waitingScreenshotCount()),
    scanHistory: (window) => ({ scans: withinWindow(analytics().timeline, window).reverse() }),
    scanDetail: (scanId) => scanDetail(scanId, analytics()),
    trends: (window) => trends(analytics(), window),
    hiringPeople: (query) => ({ people: filterHiringPeople(analytics().hiringPeople, query) }),
    hiringCompanies: () => aggregateHiringCompanies(analytics().hiringPeople),
    departedPeople: () => listDepartedPeople(analytics().index),
    networkSize: () => networkSize(analytics().index),
    settings: () => store.readSettings(),
    saveSettings: (next) => {
      store.saveSettings(next)
      return store.readSettings()
    },
    addScreenshots: (request) => addThenAnalyze(request, store, options),
    reprocessScan: (scanId) => (analytics().timeline.some((summary) => summary.id === scanId) ? { message: 'Scan reprocessed. Results unchanged.' } : null),
  }
}

function cachedAnalytics(store: TrackerStore): () => Analytics {
  let cached: { version: number; analytics: Analytics } | null = null
  return () => {
    const version = store.dataVersion()
    if (cached?.version !== version) cached = { version, analytics: analyze(store) }
    return cached.analytics
  }
}

function analyze(store: TrackerStore): Analytics {
  const index = indexNetwork(store.readNetwork())
  return { index, timeline: buildTimeline(index), hiringPeople: listHiringPeople(index) }
}

function dashboard({ index, timeline, hiringPeople }: Analytics, inboxWaitingCount: number): Dashboard {
  const latestScan = index.scansInOrder.at(-1)
  const currentlyHiring = filterHiringPeople(hiringPeople, { search: '', company: '', status: 'current', companyKnown: 'all', sort: 'lastSeen' })
  return {
    scanCount: timeline.length,
    inboxWaitingCount,
    latestScan: timeline.at(-1) ?? null,
    latestQuality: latestScan ? scanQuality(latestScan, index) : null,
    whoIsHiring: {
      peopleCount: currentlyHiring.length,
      companyCount: aggregateHiringCompanies(hiringPeople).companies.length,
      preview: currentlyHiring.slice(0, whoIsHiringPreviewSize),
    },
  }
}

function scanDetail(scanId: string, { index, timeline }: Analytics): ScanDetail | null {
  const scan = index.scansInOrder.find((candidate) => candidate.id === scanId)
  const summary = timeline.find((candidate) => candidate.id === scanId)
  if (!scan || !summary) return null
  return { summary, quality: scanQuality(scan, index), screenshots: scan.screenshots }
}

function trends({ index, timeline }: Analytics, window: TimeWindow): Trends {
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

const analyzerNotBuilt = async (): Promise<string> => 'Screenshot analysis is not built yet, so they are waiting in the inbox.'

/** Dropping screenshots is the trigger: they are stored, then analyzed straight away. */
async function addThenAnalyze(request: AddScreenshotsRequest, store: TrackerStore, options: TrackerApiOptions): Promise<AddScreenshotsResult> {
  if (!options.screenshotInbox) return nothingSaved(request)
  const added = await addScreenshots(options.screenshotInbox, request)
  for (const fileName of added.saved) store.recordWaitingScreenshot(fileName)
  if (added.saved.length === 0) return added
  const analysisMessage = await (options.analyzeNewScreenshots ?? analyzerNotBuilt)()
  return { ...added, analysisMessage, message: `${added.message} ${analysisMessage}` }
}

function nothingSaved(request: AddScreenshotsRequest): AddScreenshotsResult {
  return {
    analysisMessage: '',
    saved: [],
    rejected: request.files.map((file) => ({ fileName: file.fileName, reason: 'Demo only' })),
    message: 'This is the demo, so screenshots are not saved. Run the app locally to add your own.',
  }
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}
