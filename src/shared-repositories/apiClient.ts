import type { ZodType } from 'zod'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** The only place the frontend touches HTTP. Every response is validated against its contract. */
export async function getJson<Body>(path: string, schema: ZodType<Body>): Promise<Body> {
  return schema.parse(await request(path, { method: 'GET' }))
}

export async function sendJson<Body>(method: 'POST' | 'PUT', path: string, schema: ZodType<Body>, body?: unknown): Promise<Body> {
  const init: RequestInit = { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }
  return schema.parse(await request(path, init))
}

async function request(path: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(path, init)
  if (!response.ok) throw new ApiError(response.status, `${init.method} ${path} failed with ${response.status}`)
  return response.json()
}

export function queryString(parameters: Record<string, string>): string {
  return new URLSearchParams(parameters).toString()
}
