import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type {
  AudienceChoice,
  Dashboard,
  DepartedPerson,
  HiringPerson,
  HiringSnapshot,
  HiringSummary,
  OpenToWorkSnapshot,
  OpenToWorkSummary,
  ScanDetail,
  ScanQuality,
  ScanSummary,
  Settings,
  Snapshot,
  SnapshotSummary,
  TrendPoint,
  Trends,
} from '@contracts/api'
import type { ListExport, ListExporter } from '@/shared-exports/listExport'
import { ApiError, type Transport } from '@/shared-repositories/apiClient'
import { TrackerEnvironmentContext, type TrackerMode, trackerEnvironmentFor } from '@/shared-repositories/trackerEnvironment'
import type { SnapshotRepository } from '@/use-cases/Snapshots/SnapshotRepository'

const offlineTransport: Transport = async ({ path }) => {
  throw new Error(`No network in hook tests (asked for ${path})`)
}

export function freshQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
}

interface TrackerPlacement {
  mode?: TrackerMode
  audience?: AudienceChoice
  path?: string
  routePath?: string
}

export function insideTracker({ mode = 'live', audience = 'followers', path = '/', routePath = '*' }: TrackerPlacement = {}) {
  const environment = trackerEnvironmentFor(mode, audience, offlineTransport)
  const queryClient = freshQueryClient()
  return function TrackerPage({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TrackerEnvironmentContext.Provider value={environment}>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path={routePath} element={children} />
            </Routes>
          </MemoryRouter>
        </TrackerEnvironmentContext.Provider>
      </QueryClientProvider>
    )
  }
}

export function pendingAnswer<Value>() {
  let settle: (value: Value) => void = () => undefined
  let fail: (error: Error) => void = () => undefined
  const promise = new Promise<Value>((resolve, reject) => {
    settle = resolve
    fail = reject
  })
  return { promise, settle, fail }
}

export function openToWorkSummary(overrides: Partial<OpenToWorkSummary> = {}): OpenToWorkSummary {
  return {
    open: 118,
    notOpen: 1_082,
    uncertain: 4,
    rate: 9.8333,
    matchedRate: 9.6,
    matchedCount: 1_150,
    sevenDayChangePp: 1.2,
    added: 12,
    removed: 7,
    net: 5,
    entryRate: 1.04,
    removalRate: 5.9,
    entryExitRatio: 1.714,
    hasComparablePrior: true,
    ...overrides,
  }
}

export function hiringSummary(overrides: Partial<HiringSummary> = {}): HiringSummary {
  return {
    hiring: 46,
    notHiring: 1_152,
    uncertain: 6,
    rate: 3.84,
    added: 3,
    removed: 5,
    net: -2,
    companyCount: 31,
    hasComparablePrior: true,
    ...overrides,
  }
}

export function scanSummary(overrides: Partial<ScanSummary> = {}): ScanSummary {
  return {
    id: 'scan-2026-09-22',
    scanDate: '2026-09-22',
    screenshotCount: 42,
    peopleCount: 1_204,
    duplicateCount: 37,
    openToWork: openToWorkSummary(),
    hiring: hiringSummary(),
    ...overrides,
  }
}

export function scanQuality(overrides: Partial<ScanQuality> = {}): ScanQuality {
  return {
    screenshotCount: 42,
    cardsDetected: 1_241,
    uniquePeople: 1_204,
    duplicateCount: 37,
    openToWork: { highConfidence: 1_150, lowConfidence: 50, uncertain: 4 },
    hiring: { highConfidence: 1_170, lowConfidence: 28, uncertain: 6 },
    classificationCoverage: 99.5,
    companyExtraction: { identified: 31, lowConfidence: 9, notVisible: 6 },
    ...overrides,
  }
}

export function hiringPerson(overrides: Partial<HiringPerson> = {}): HiringPerson {
  return {
    personId: 'person-mike-brown',
    displayName: 'Mike Brown',
    headline: 'CTO at Northwind',
    companyName: 'Northwind',
    companyNeedsReview: false,
    firstSeenHiring: '2026-09-01',
    lastSeenHiring: '2026-09-22',
    lastSeen: '2026-09-22',
    hiringSince: '2026-09-01',
    daysHiring: 22,
    scansSeenHiring: 4,
    isCurrentlyHiring: true,
    wasObservedInLatestScan: true,
    ...overrides,
  }
}

export function dashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return {
    scanCount: 180,
    inboxWaitingCount: 0,
    scanReminder: null,
    latestScan: scanSummary(),
    latestQuality: scanQuality(),
    whoIsHiring: { peopleCount: 46, companyCount: 31, preview: [hiringPerson()] },
    ...overrides,
  }
}

export function scanDetail(overrides: Partial<ScanDetail> = {}): ScanDetail {
  return {
    summary: scanSummary(),
    quality: scanQuality(),
    screenshots: [
      { fileName: 'followers-page-1.png', peopleDetected: 12, uncertainCount: 2, outcome: 'warning', warning: 'Two cards were cut off' },
      { fileName: 'followers-page-2.png', peopleDetected: 9, uncertainCount: 0, outcome: 'processed', warning: null },
    ],
    ...overrides,
  }
}

export function trendPoint(overrides: Partial<TrendPoint> = {}): TrendPoint {
  return {
    scanDate: '2026-09-22',
    openRate: 9.8,
    openRateSevenDayAverage: 9.5,
    matchedOpenRate: 9.6,
    addedOpen: 12,
    removedOpen: 7,
    netOpen: 5,
    entryRate: 1.04,
    removalRate: 5.9,
    hiringRate: 3.8,
    addedHiring: 3,
    removedHiring: 5,
    netHiring: -2,
    ...overrides,
  }
}

export function trends(overrides: Partial<Trends> = {}): Trends {
  return {
    points: [trendPoint({ scanDate: '2026-09-21', openRate: 9.4 }), trendPoint()],
    movingAverages: [
      { label: '7-day average', rate: 9.46, changePp: 0.42 },
      { label: '30-day average', rate: 8.91, changePp: -0.35 },
    ],
    flowTotals: { addedOpen: 1_204, removedOpen: 963, entryExitRatio: 1.2502 },
    durations: {
      completedEpisodes: 58,
      medianDays: 41,
      buckets: [
        { label: 'Under 30 days', share: 33.4 },
        { label: '30–90 days', share: 46.6 },
        { label: 'Over 90 days', share: 20 },
      ],
    },
    ...overrides,
  }
}

export function departedPerson(overrides: Partial<DepartedPerson> = {}): DepartedPerson {
  return {
    personId: 'person-ana-silva',
    displayName: 'Ana Silva',
    headline: 'Product Designer',
    companyName: 'Contoso',
    firstSeen: '2026-04-02',
    lastSeen: '2026-09-15',
    scansMissed: 4,
    wasOpenToWorkWhenLastSeen: false,
    wasHiringWhenLastSeen: false,
    ...overrides,
  }
}

export function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    inboxDirectory: '/Users/dana/LinkedIn/inbox',
    archiveDirectory: '/Users/dana/LinkedIn/archive',
    automaticProcessing: true,
    openToWorkThresholds: { open: 0.85, notOpen: 0.15 },
    hiringThresholds: { hiring: 0.9, notHiring: 0.1 },
    visionFallback: false,
    scanFrequency: 'daily',
    retention: 'forever',
    afterAnalysis: 'delete',
    ...overrides,
  }
}

export function recordingExporter() {
  const saved: ListExport[] = []
  const exporter: ListExporter = {
    save: async (listExport) => {
      saved.push(listExport)
    },
  }
  return { exporter, saved }
}

export function openToWorkSnapshot(overrides: Partial<OpenToWorkSnapshot> = {}): OpenToWorkSnapshot {
  return { id: 'snapshot-before-layoffs', kind: 'open-to-work', name: 'Before the layoffs', createdAt: '2026-09-23T12:00:00.000Z', peopleCount: 0, people: [], ...overrides }
}

export function hiringSnapshot(overrides: Partial<HiringSnapshot> = {}): HiringSnapshot {
  return {
    id: 'snapshot-hiring-in-june',
    kind: 'hiring',
    name: 'Hiring in June',
    createdAt: '2026-06-15T12:00:00.000Z',
    peopleCount: 0,
    filters: { search: '', company: '', status: 'current', companyKnown: 'all', sort: 'lastSeen' },
    people: [],
    ...overrides,
  }
}

export function fakeSnapshotRepository(initial: Snapshot[] = []) {
  let snapshots = [...initial]
  const saves: Parameters<SnapshotRepository['save']>[] = []
  const summaryOf = ({ id, kind, name, createdAt, peopleCount }: Snapshot): SnapshotSummary => ({ id, kind, name, createdAt, peopleCount })
  const find = (snapshotId: string) => {
    const snapshot = snapshots.find((candidate) => candidate.id === snapshotId)
    if (!snapshot) throw new ApiError(404, 'No such snapshot')
    return snapshot
  }
  const repository: SnapshotRepository = {
    list: async (kind) => snapshots.filter((snapshot) => snapshot.kind === kind).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(summaryOf),
    save: async (kind, request) => {
      saves.push([kind, request])
      const fields = { id: `snapshot-saved-${saves.length}`, name: request.name || 'Sep 23, 2026 · 0 people', createdAt: `2026-09-23T12:0${saves.length}:00.000Z`, peopleCount: 0 }
      const snapshot: Snapshot = kind === 'hiring' ? hiringSnapshot({ ...fields, filters: { ...hiringSnapshot().filters, ...request.filters } }) : openToWorkSnapshot(fields)
      snapshots = [...snapshots, snapshot]
      return summaryOf(snapshot)
    },
    load: async (snapshotId) => find(snapshotId),
    remove: async (snapshotId) => {
      const snapshot = find(snapshotId)
      snapshots = snapshots.filter((candidate) => candidate !== snapshot)
      return summaryOf(snapshot)
    },
  }
  return { repository, saves, snapshotIds: () => snapshots.map((snapshot) => snapshot.id) }
}
