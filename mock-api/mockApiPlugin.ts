import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import type { Settings } from '../contracts/api.ts'
import type { Network } from './domain/observation.ts'
import { type ApiRequest, routeRequest } from './routes.ts'
import { generateSampleNetwork } from './seed/generateSampleNetwork.ts'
import { createTrackerApi } from './trackerApi.ts'

type SampleScenario = 'empty' | 'single' | 'full'

const defaultSettings: Settings = {
  inboxDirectory: 'LinkedinScreenShots/',
  archiveDirectory: 'data/screenshots/',
  automaticProcessing: true,
  openToWorkThresholds: { open: 0.9, notOpen: 0.1 },
  hiringThresholds: { hiring: 0.9, notHiring: 0.1 },
  visionFallback: false,
  scanFrequency: 'daily',
  retention: 'forever',
}

/**
 * Dev-only stand-in for the Koa backend: answers /api/* with sample data so the UI runs with `pnpm dev`.
 * Pick a scenario with TRACKER_SAMPLE=empty|single|full (default full).
 */
export function mockApiPlugin(): Plugin {
  return {
    name: 'tracker-mock-api',
    configureServer(server) {
      const api = createTrackerApi(sampleNetwork(scenarioFromEnvironment()), defaultSettings)
      server.middlewares.use('/api', (request, response) => {
        void answer(request, response, (apiRequest) => routeRequest(api, apiRequest))
      })
    },
  }
}

function scenarioFromEnvironment(): SampleScenario {
  const scenario = process.env.TRACKER_SAMPLE
  return scenario === 'empty' || scenario === 'single' ? scenario : 'full'
}

function sampleNetwork(scenario: SampleScenario): Network {
  if (scenario === 'empty') return { people: [], scans: [], observations: [] }
  const days = scenario === 'single' ? 1 : 180
  return generateSampleNetwork({ latestScanDate: todayIsoDate(), days, peopleCount: 500, seed: 2026 })
}

function todayIsoDate(): string {
  const today = new Date()
  return [today.getFullYear(), today.getMonth() + 1, today.getDate()].map((part) => String(part).padStart(2, '0')).join('-')
}

async function answer(
  request: IncomingMessage,
  response: ServerResponse,
  route: (apiRequest: ApiRequest) => ReturnType<typeof routeRequest>,
): Promise<void> {
  const url = new URL((request as IncomingMessage & { originalUrl?: string }).originalUrl ?? request.url ?? '/', 'http://localhost')
  const result = route({
    method: request.method ?? 'GET',
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    body: await readJsonBody(request),
  })
  response.statusCode = result.status
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(result.body))
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(chunk as Buffer)
  const text = Buffer.concat(chunks).toString('utf8')
  return text ? JSON.parse(text) : null
}
