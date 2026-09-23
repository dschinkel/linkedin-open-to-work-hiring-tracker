import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import type { Network } from './domain/observation.ts'
import { defaultSettings } from './defaultSettings.ts'
import { folderInbox } from './folderInbox.ts'
import { type ApiRequest, routeRequest } from './routes.ts'
import { generateSampleNetwork } from './seed/generateSampleNetwork.ts'
import { createTrackerApi } from './trackerApi.ts'

type SampleScenario = 'empty' | 'single' | 'full'

const notBuiltYet = 'Screenshot analysis is not built yet. Try the demo to see sample results.'

/**
 * Dev-only stand-in for the Koa backend at /api/*. It has no scans by default, because screenshot
 * analysis does not exist yet. TRACKER_SAMPLE=single|full fills it with sample data instead.
 * (The public demo at /demo does not use this; it runs the same API inside the browser.)
 */
export function mockApiPlugin(): Plugin {
  return {
    name: 'tracker-mock-api',
    configureServer(server) {
      const screenshotInbox = folderInbox(server.config.root, () => api.settings().inboxDirectory)
      const api = createTrackerApi(sampleNetwork(scenarioFromEnvironment()), defaultSettings, { analyzeMessage: notBuiltYet, screenshotInbox })
      server.middlewares.use('/api', (request, response) => {
        void answer(request, response, (apiRequest) => routeRequest(api, apiRequest))
      })
    },
  }
}

function scenarioFromEnvironment(): SampleScenario {
  const scenario = process.env.TRACKER_SAMPLE
  return scenario === 'single' || scenario === 'full' ? scenario : 'empty'
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
  const result = await route({
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
