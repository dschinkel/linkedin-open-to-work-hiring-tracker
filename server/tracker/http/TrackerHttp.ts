import { z } from 'zod'
import type { CompanyHiring, SaveSnapshotRequest, Snapshot, SnapshotKind, SnapshotList, SnapshotSummary, Dashboard, DepartedPeople, HiringPeopleQuery, HiringPerson, NetworkSize, OpenToWorkPerson, ProcessingResult, ScanDetail, ScanPeople, ScanHistory, Settings, TimeWindow, TitleTrends, Trends } from '../../../contracts/api.ts'
import { hiringPeopleQuerySchema, saveSnapshotRequestSchema, settingsSchema, snapshotKindSchema, timeWindowSchema } from '../../../contracts/api.ts'
import { type ApiRequest, type ApiResponse, ok, orNotFound } from '../../app/HttpRouting.ts'

export interface TrackerUseCases {
  viewDashboard: () => Dashboard
  listScans: (window: TimeWindow) => ScanHistory
  viewScan: (scanId: string) => ScanDetail | null
  listScanPeople: (scanId: string) => ScanPeople | null
  viewTrends: (window: TimeWindow) => Trends
  viewTitleTrends: (window: TimeWindow) => TitleTrends
  findHiringPeople: (query: HiringPeopleQuery) => { people: HiringPerson[] }
  listHiringCompanies: () => CompanyHiring
  findOpenToWorkPeople: () => { people: OpenToWorkPerson[] }
  findDepartedPeople: () => DepartedPeople
  measureNetworkSize: () => NetworkSize
  viewSettings: () => Settings
  saveSettings: (settings: Settings) => Settings
  clearAllData: () => Promise<ProcessingResult>
  listSnapshots: (kind: SnapshotKind) => SnapshotList
  saveSnapshot: (kind: SnapshotKind, request: SaveSnapshotRequest) => SnapshotSummary
  viewSnapshot: (snapshotId: string) => Snapshot | null
  deleteSnapshot: (snapshotId: string) => SnapshotSummary | null
}

const windowQuery = z.object({ window: timeWindowSchema.default('90d') })
const kindQuery = z.object({ kind: snapshotKindSchema })

/** Inbound adapter: validates each request against the contract, calls the use case, returns the response. */
export const trackerHttp = (useCases: TrackerUseCases) => ({
  dashboard: (): ApiResponse => ok(useCases.viewDashboard()),
  scans: (request: ApiRequest): ApiResponse => ok(useCases.listScans(windowQuery.parse(request.query).window)),
  scan: (_request: ApiRequest, [scanId]: string[]): ApiResponse => orNotFound(useCases.viewScan(scanId)),
  scanPeople: (_request: ApiRequest, [scanId]: string[]): ApiResponse => orNotFound(useCases.listScanPeople(scanId)),
  trends: (request: ApiRequest): ApiResponse => ok(useCases.viewTrends(windowQuery.parse(request.query).window)),
  titleTrends: (request: ApiRequest): ApiResponse => ok(useCases.viewTitleTrends(windowQuery.parse(request.query).window)),
  hiringPeople: (request: ApiRequest): ApiResponse => ok(useCases.findHiringPeople(hiringPeopleQuerySchema.parse(request.query))),
  hiringCompanies: (): ApiResponse => ok(useCases.listHiringCompanies()),
  openToWorkPeople: (): ApiResponse => ok(useCases.findOpenToWorkPeople()),
  departed: (): ApiResponse => ok(useCases.findDepartedPeople()),
  networkSize: (): ApiResponse => ok(useCases.measureNetworkSize()),
  settings: (): ApiResponse => ok(useCases.viewSettings()),
  saveSettings: (request: ApiRequest): ApiResponse => ok(useCases.saveSettings(settingsSchema.parse(request.body))),
  clearAllData: async (): Promise<ApiResponse> => ok(await useCases.clearAllData()),
  snapshots: (request: ApiRequest): ApiResponse => ok(useCases.listSnapshots(kindQuery.parse(request.query).kind)),
  saveSnapshot: (request: ApiRequest): ApiResponse => ok(useCases.saveSnapshot(kindQuery.parse(request.query).kind, saveSnapshotRequestSchema.parse(request.body ?? {}))),
  snapshot: (_request: ApiRequest, [snapshotId]: string[]): ApiResponse => orNotFound(useCases.viewSnapshot(snapshotId)),
  deleteSnapshot: (_request: ApiRequest, [snapshotId]: string[]): ApiResponse => orNotFound(useCases.deleteSnapshot(snapshotId)),
})

export type TrackerHttp = ReturnType<typeof trackerHttp>
