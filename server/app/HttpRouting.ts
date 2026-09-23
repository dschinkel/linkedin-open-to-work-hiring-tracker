import { z } from 'zod'

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

export interface Route {
  method: 'GET' | 'POST' | 'PUT'
  pattern: RegExp
  respond: (request: ApiRequest, params: string[]) => ApiResponse | Promise<ApiResponse>
}

export const ok = (body: unknown): ApiResponse => ({ status: 200, body })
export const notFound = (): ApiResponse => ({ status: 404, body: { error: 'Not found' } })
export const orNotFound = (body: unknown): ApiResponse => (body === null ? notFound() : ok(body))

/**
 * Framework-free dispatch: Koa (server) and the in-browser demo both answer requests through this.
 * Input that fails its Zod contract is a 400; anything else that throws is a 500 with its message.
 */
export async function answerRequest(routes: Route[], request: ApiRequest): Promise<ApiResponse> {
  for (const route of routes) {
    const match = route.method === request.method ? route.pattern.exec(request.path) : null
    if (match) return respondSafely(route, request, match.slice(1))
  }
  return notFound()
}

async function respondSafely(route: Route, request: ApiRequest, params: string[]): Promise<ApiResponse> {
  try {
    return await route.respond(request, params)
  } catch (error) {
    if (error instanceof z.ZodError) return { status: 400, body: { error: 'Invalid request', issues: error.issues } }
    return { status: 500, body: { error: error instanceof Error ? error.message : 'Unexpected error' } }
  }
}
