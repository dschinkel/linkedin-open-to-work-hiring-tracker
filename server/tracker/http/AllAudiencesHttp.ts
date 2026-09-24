import { z } from 'zod'
import type { CompanyHiring, HiringPeopleQuery, HiringPerson, NetworkSize, OpenToWorkPerson, SaveSnapshotRequest, Snapshot, SnapshotKind, SnapshotList, SnapshotSummary } from '../../../contracts/api.ts'
import { hiringPeopleQuerySchema, saveSnapshotRequestSchema, snapshotKindSchema } from '../../../contracts/api.ts'
import { type ApiRequest, type ApiResponse, ok, orNotFound, type Route } from '../../app/HttpRouting.ts'

export interface AllAudiencesUseCases {
  findOpenToWorkPeople: () => { people: OpenToWorkPerson[] }
  findHiringPeople: (query: HiringPeopleQuery) => { people: HiringPerson[] }
  listHiringCompanies: () => CompanyHiring
  measureNetworkSize: () => NetworkSize
  listSnapshots: (kind: SnapshotKind) => SnapshotList
  saveSnapshot: (kind: SnapshotKind, request: SaveSnapshotRequest) => SnapshotSummary
  viewSnapshot: (snapshotId: string) => Snapshot | null
  deleteSnapshot: (snapshotId: string) => SnapshotSummary | null
}

const kindQuery = z.object({ kind: snapshotKindSchema })

export const allAudiencesRoutes = (useCases: AllAudiencesUseCases): Route[] => [
  { method: 'GET', pattern: /^\/api\/open-to-work\/people$/, respond: () => ok(useCases.findOpenToWorkPeople()) },
  { method: 'GET', pattern: /^\/api\/hiring\/people$/, respond: (request) => ok(useCases.findHiringPeople(hiringPeopleQuerySchema.parse(request.query))) },
  { method: 'GET', pattern: /^\/api\/hiring\/companies$/, respond: () => ok(useCases.listHiringCompanies()) },
  { method: 'GET', pattern: /^\/api\/network-size$/, respond: () => ok(useCases.measureNetworkSize()) },
  { method: 'GET', pattern: /^\/api\/snapshots$/, respond: (request) => ok(useCases.listSnapshots(kindQuery.parse(request.query).kind)) },
  { method: 'POST', pattern: /^\/api\/snapshots$/, respond: (request) => saveSnapshot(useCases, request) },
  { method: 'GET', pattern: /^\/api\/snapshots\/([\w-]+)$/, respond: (_request, [snapshotId]) => orNotFound(useCases.viewSnapshot(snapshotId)) },
  { method: 'DELETE', pattern: /^\/api\/snapshots\/([\w-]+)$/, respond: (_request, [snapshotId]) => orNotFound(useCases.deleteSnapshot(snapshotId)) },
]

function saveSnapshot(useCases: AllAudiencesUseCases, request: ApiRequest): ApiResponse {
  return ok(useCases.saveSnapshot(kindQuery.parse(request.query).kind, saveSnapshotRequestSchema.parse(request.body ?? {})))
}
