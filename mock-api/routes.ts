import { z } from 'zod'
import { addScreenshotsRequestSchema, hiringPeopleQuerySchema, settingsSchema, timeWindowSchema } from '../contracts/api.ts'
import type { TrackerApi } from './trackerApi.ts'

export interface ApiRequest {
  method: string
  path: string
  query: Record<string, string>
  body: unknown
}

export interface ApiResponse {
  status: number
  body: unknown
}

interface Route {
  method: 'GET' | 'POST' | 'PUT'
  pattern: RegExp
  respond: (api: TrackerApi, request: ApiRequest, params: string[]) => ApiResponse | Promise<ApiResponse>
}

const windowQuery = z.object({ window: timeWindowSchema.default('90d') })

const ok = (body: unknown): ApiResponse => ({ status: 200, body })
const notFound = (): ApiResponse => ({ status: 404, body: { error: 'Not found' } })
const orNotFound = (body: unknown): ApiResponse => (body === null ? notFound() : ok(body))

const routes: Route[] = [
  { method: 'GET', pattern: /^\/api\/dashboard$/, respond: (api) => ok(api.dashboard()) },
  { method: 'GET', pattern: /^\/api\/scans$/, respond: (api, request) => ok(api.scanHistory(windowQuery.parse(request.query).window)) },
  { method: 'GET', pattern: /^\/api\/scans\/([\w-]+)$/, respond: (api, _request, [scanId]) => orNotFound(api.scanDetail(scanId)) },
  { method: 'POST', pattern: /^\/api\/scans\/([\w-]+)\/reprocess$/, respond: (api, _request, [scanId]) => orNotFound(api.reprocessScan(scanId)) },
  { method: 'POST', pattern: /^\/api\/screenshots$/, respond: async (api, request) => ok(await api.addScreenshots(addScreenshotsRequestSchema.parse(request.body))) },
  { method: 'GET', pattern: /^\/api\/analytics\/trends$/, respond: (api, request) => ok(api.trends(windowQuery.parse(request.query).window)) },
  { method: 'GET', pattern: /^\/api\/hiring\/people$/, respond: (api, request) => ok(api.hiringPeople(hiringPeopleQuerySchema.parse(request.query))) },
  { method: 'GET', pattern: /^\/api\/hiring\/companies$/, respond: (api) => ok(api.hiringCompanies()) },
  { method: 'GET', pattern: /^\/api\/departed$/, respond: (api) => ok(api.departedPeople()) },
  { method: 'GET', pattern: /^\/api\/settings$/, respond: (api) => ok(api.settings()) },
  { method: 'PUT', pattern: /^\/api\/settings$/, respond: (api, request) => ok(api.saveSettings(settingsSchema.parse(request.body))) },
]

/** Matches a request to a route and validates its input with Zod at the boundary. */
export async function routeRequest(api: TrackerApi, request: ApiRequest): Promise<ApiResponse> {
  for (const route of routes) {
    const match = route.method === request.method ? route.pattern.exec(request.path) : null
    if (match) return respondSafely(route, api, request, match.slice(1))
  }
  return notFound()
}

async function respondSafely(route: Route, api: TrackerApi, request: ApiRequest, params: string[]): Promise<ApiResponse> {
  try {
    return await route.respond(api, request, params)
  } catch (error) {
    if (error instanceof z.ZodError) return { status: 400, body: { error: 'Invalid request', issues: error.issues } }
    return { status: 500, body: { error: error instanceof Error ? error.message : 'Unexpected error' } }
  }
}
