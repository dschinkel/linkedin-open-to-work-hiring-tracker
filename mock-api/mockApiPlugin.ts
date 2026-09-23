import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import type { Network } from './domain/observation.ts'
import type { Audience } from '../contracts/api.ts'
import { type AudienceApis, routeAudienceRequest } from './audienceRoutes.ts'
import { defaultSettingsFor } from './defaultSettings.ts'
import { folderInbox } from './folderInbox.ts'
import type { ApiRequest, ApiResponse } from './routes.ts'
import { generateSampleNetwork } from './seed/generateSampleNetwork.ts'
import { createTrackerApi, type TrackerApi } from './trackerApi.ts'

type SampleScenario = 'empty' | 'single' | 'full'

/**
 * Dev-only stand-in for the Koa backend at /api/*. It has no scans by default, because screenshot
 * analysis does not exist yet. TRACKER_SAMPLE=single|full fills it with sample data instead.
 * (The public demo at /demo does not use this; it runs the same API inside the browser.)
 */
export function mockApiPlugin(): Plugin {
  return {
    name: 'tracker-mock-api',
    configureServer(server) {
      const scenario = scenarioFromEnvironment()
      const apis: AudienceApis = {
        contacts: liveTrackerFor('contacts', scenario, server.config.root),
        followers: liveTrackerFor('followers', scenario, server.config.root),
      }
      server.middlewares.use('/api', (request, response) => {
        void answer(request, response, (apiRequest) => routeAudienceRequest(apis, apiRequest))
      })
    },
  }
}

function liveTrackerFor(audience: Audience, scenario: SampleScenario, projectRoot: string): TrackerApi {
  const screenshotInbox = folderInbox(projectRoot, () => api.settings().inboxDirectory)
  const api = createTrackerApi(sampleNetwork(scenario), defaultSettingsFor(audience), { screenshotInbox })
  return api
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
  route: (apiRequest: ApiRequest) => Promise<ApiResponse>,
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
