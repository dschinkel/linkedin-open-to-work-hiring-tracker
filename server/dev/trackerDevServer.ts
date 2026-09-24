import type { Plugin } from 'vite'
import type { Audience } from '../../contracts/api.ts'
import { answerAudienceRequest, type RoutesByAudience } from '../app/AudienceRouting.ts'
import { trackerKoaApp } from '../app/KoaApp.ts'
import { liveTrackers } from '../app/LiveTrackers.ts'
import { sampleTrackerRoutes } from '../sample/DemoTrackers.ts'
import { generateSampleNetwork } from '../sample/SampleNetwork.ts'
import { screenshotCardReader } from '../screenshots/outbound/vision/ScreenshotCardReader.ts'

type SampleScenario = 'single' | 'full'

export function trackerDevServer(): Plugin {
  return {
    name: 'tracker-api',
    configureServer(server) {
      const log = (message: string) => server.config.logger.info(`  ${message}`)
      const routesByAudience = routesFor(scenarioFromEnvironment(), server.config.root, log, (stop) => server.httpServer?.once('close', () => void stop()))
      const koa = trackerKoaApp((request) => answerAudienceRequest(routesByAudience, request)).callback()
      server.middlewares.use((request, response, next) => ((request.url ?? '').startsWith('/api/') ? koa(request, response) : next()))
    },
  }
}

function routesFor(scenario: SampleScenario | null, projectRoot: string, log: (message: string) => void, onClose: (stop: () => Promise<void>) => void): RoutesByAudience {
  if (scenario !== null) {
    log(`Tracker: in-memory sample data (TRACKER_SAMPLE=${scenario}); your database is not used.`)
    return { followers: sampleRoutes('followers', scenario), contacts: sampleRoutes('contacts', scenario) }
  }
  const trackers = liveTrackers({ projectRoot, cardReader: screenshotCardReader(), log })
  onClose(trackers.watchInboxes())
  return trackers.routesByAudience
}

function sampleRoutes(audience: Audience, scenario: SampleScenario) {
  const days = scenario === 'single' ? 1 : 180
  return sampleTrackerRoutes(audience, generateSampleNetwork({ latestScanDate: todayIsoDate(), days, peopleCount: 500, seed: audience === 'followers' ? 7331 : 2026 }))
}

function scenarioFromEnvironment(): SampleScenario | null {
  const scenario = process.env.TRACKER_SAMPLE
  return scenario === 'single' || scenario === 'full' ? scenario : null
}

function todayIsoDate(): string {
  const today = new Date()
  return [today.getFullYear(), today.getMonth() + 1, today.getDate()].map((part) => String(part).padStart(2, '0')).join('-')
}
