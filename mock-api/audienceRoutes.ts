import { type Audience, audienceSchema } from '../contracts/api.ts'
import { type ApiRequest, type ApiResponse, routeRequest } from './routes.ts'
import type { TrackerApi } from './trackerApi.ts'

export type AudienceApis = Record<Audience, TrackerApi>

const audiencePath = /^\/api\/([^/]+)(\/.*)$/

/** "/api/followers/dashboard" is answered by the followers tracker as "/api/dashboard". */
export function routeAudienceRequest(apis: AudienceApis, request: ApiRequest): Promise<ApiResponse> {
  const match = audiencePath.exec(request.path)
  const audience = audienceSchema.safeParse(match?.[1])
  if (!match || !audience.success) return Promise.resolve({ status: 404, body: { error: 'Unknown audience' } })
  return routeRequest(apis[audience.data], { ...request, path: `/api${match[2]}` })
}
