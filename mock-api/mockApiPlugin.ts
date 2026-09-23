import type { IncomingMessage, ServerResponse } from 'node:http'
import { existsSync } from 'node:fs'
import path from 'node:path'
import type { Logger, Plugin } from 'vite'
import type { Network } from './domain/observation.ts'
import type { Audience } from '../contracts/api.ts'
import { type AudienceApis, routeAudienceRequest } from './audienceRoutes.ts'
import { defaultSettingsFor } from './defaultSettings.ts'
import { folderInbox } from './folderInbox.ts'
import type { ApiRequest, ApiResponse } from './routes.ts'
import { generateSampleNetwork } from './seed/generateSampleNetwork.ts'
import { defaultDatabasePath, openTrackerDatabase, sqliteStore } from './sqliteStore.ts'
import { createTrackerApi, type TrackerApi } from './trackerApi.ts'
import { memoryStore, type TrackerStore } from './trackerStore.ts'

type SampleScenario = 'single' | 'full'

/**
 * Dev-only stand-in for the Koa backend at /api/*, reading and writing the local SQLite database. It has no scans
 * analysis does not exist yet. TRACKER_SAMPLE=single|full fills it with sample data instead.
 * (The public demo at /demo does not use this; it runs the same API inside the browser.)
 */
export function mockApiPlugin(): Plugin {
  return {
    name: 'tracker-mock-api',
    configureServer(server) {
      const storeFor = trackerStoresFor(scenarioFromEnvironment(), server.config.root, server.config.logger)
      const apis: AudienceApis = {
        contacts: liveTrackerFor('contacts', storeFor, server.config.root),
        followers: liveTrackerFor('followers', storeFor, server.config.root),
      }
      server.middlewares.use('/api', (request, response) => {
        void answer(request, response, (apiRequest) => routeAudienceRequest(apis, apiRequest))
      })
    },
  }
}

function liveTrackerFor(audience: Audience, storeFor: (audience: Audience) => TrackerStore, projectRoot: string): TrackerApi {
  const screenshotInbox = folderInbox(projectRoot, () => api.settings().inboxDirectory)
  const api = createTrackerApi(storeFor(audience), { screenshotInbox })
  return api
}

/**
 * Normally your real data: data/linkedin.sqlite, created with all its tables the first time `pnpm dev` runs.
 * TRACKER_SAMPLE=single|full swaps in throwaway sample data held in memory, so it never touches your database.
 */
function trackerStoresFor(scenario: SampleScenario | null, projectRoot: string, logger: Logger): (audience: Audience) => TrackerStore {
  if (scenario !== null) {
    logger.info(`  Tracker: in-memory sample data (TRACKER_SAMPLE=${scenario}); your database is not used.`)
    return (audience) => memoryStore(sampleNetwork(scenario), defaultSettingsFor(audience))
  }
  const databasePath = path.join(projectRoot, defaultDatabasePath)
  const isNew = !existsSync(databasePath)
  const database = openTrackerDatabase(databasePath)
  logger.info(`  Tracker: ${isNew ? 'created' : 'using'} SQLite database ${defaultDatabasePath}`)
  return (audience) => sqliteStore(database, audience, defaultSettingsFor(audience))
}

function scenarioFromEnvironment(): SampleScenario | null {
  const scenario = process.env.TRACKER_SAMPLE
  return scenario === 'single' || scenario === 'full' ? scenario : null
}

function sampleNetwork(scenario: SampleScenario): Network {
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
