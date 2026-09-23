import { z } from 'zod'
import type { CompanyHiring, Dashboard, DepartedPeople, HiringPeopleQuery, HiringPerson, NetworkSize, ScanDetail, ScanHistory, Settings, TimeWindow, Trends } from '../../../contracts/api.ts'
import { hiringPeopleQuerySchema, settingsSchema, timeWindowSchema } from '../../../contracts/api.ts'
import { type ApiRequest, type ApiResponse, ok, orNotFound } from '../../app/HttpRouting.ts'

export interface TrackerUseCases {
  viewDashboard: () => Dashboard
  listScans: (window: TimeWindow) => ScanHistory
  viewScan: (scanId: string) => ScanDetail | null
  viewTrends: (window: TimeWindow) => Trends
  findHiringPeople: (query: HiringPeopleQuery) => { people: HiringPerson[] }
  listHiringCompanies: () => CompanyHiring
  findDepartedPeople: () => DepartedPeople
  measureNetworkSize: () => NetworkSize
  viewSettings: () => Settings
  saveSettings: (settings: Settings) => Settings
}

const windowQuery = z.object({ window: timeWindowSchema.default('90d') })

/** Inbound adapter: validates each request against the contract, calls the use case, returns the response. */
export const trackerHttp = (useCases: TrackerUseCases) => ({
  dashboard: (): ApiResponse => ok(useCases.viewDashboard()),
  scans: (request: ApiRequest): ApiResponse => ok(useCases.listScans(windowQuery.parse(request.query).window)),
  scan: (_request: ApiRequest, [scanId]: string[]): ApiResponse => orNotFound(useCases.viewScan(scanId)),
  trends: (request: ApiRequest): ApiResponse => ok(useCases.viewTrends(windowQuery.parse(request.query).window)),
  hiringPeople: (request: ApiRequest): ApiResponse => ok(useCases.findHiringPeople(hiringPeopleQuerySchema.parse(request.query))),
  hiringCompanies: (): ApiResponse => ok(useCases.listHiringCompanies()),
  departed: (): ApiResponse => ok(useCases.findDepartedPeople()),
  networkSize: (): ApiResponse => ok(useCases.measureNetworkSize()),
  settings: (): ApiResponse => ok(useCases.viewSettings()),
  saveSettings: (request: ApiRequest): ApiResponse => ok(useCases.saveSettings(settingsSchema.parse(request.body))),
})

export type TrackerHttp = ReturnType<typeof trackerHttp>
