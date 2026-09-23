import type { ZodType } from 'zod'

export interface TransportRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  body?: unknown
}

export interface TransportResponse {
  status: number
  body: unknown
}

/** How a request reaches the tracker API: over HTTP, or in-process for the demo. */
export type Transport = (request: TransportRequest) => Promise<TransportResponse>

export interface ApiClient {
  getJson: <Body>(path: string, schema: ZodType<Body>) => Promise<Body>
  sendJson: <Body>(method: 'POST' | 'PUT' | 'DELETE', path: string, schema: ZodType<Body>, body?: unknown) => Promise<Body>
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const httpTransport: Transport = async ({ method, path, body }) => {
  const init: RequestInit = { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }
  const response = await fetch(path, init)
  return { status: response.status, body: await response.json() }
}

/** The only place the frontend talks to the API. Every response is validated against its contract. */
export function createApiClient(transport: Transport, apiBase: string): ApiClient {
  async function request(transportRequest: TransportRequest): Promise<unknown> {
    const response = await transport(transportRequest)
    if (response.status >= 400) throw new ApiError(response.status, `${transportRequest.method} ${transportRequest.path} failed with ${response.status}`)
    return response.body
  }

  return {
    getJson: async (path, schema) => schema.parse(await request({ method: 'GET', path: `${apiBase}${path}` })),
    sendJson: async (method, path, schema, body) => schema.parse(await request({ method, path: `${apiBase}${path}`, body })),
  }
}

export function queryString(parameters: Record<string, string>): string {
  return new URLSearchParams(parameters).toString()
}
