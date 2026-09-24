import { type AudienceChoice, audienceChoiceSchema } from '../../contracts/api.ts'
import { type ApiRequest, type ApiResponse, answerRequest, type Route } from './HttpRouting.ts'

export type RoutesByAudience = Record<AudienceChoice, Route[]>

const audiencePath = /^\/api\/([^/]+)(\/.*)$/

export function answerAudienceRequest(routesByAudience: RoutesByAudience, request: ApiRequest): Promise<ApiResponse> {
  const match = audiencePath.exec(request.path)
  const audience = audienceChoiceSchema.safeParse(match?.[1])
  if (!match || !audience.success) return Promise.resolve({ status: 404, body: { error: 'Unknown audience' } })
  return answerRequest(routesByAudience[audience.data], { ...request, path: `/api${match[2]}` })
}
