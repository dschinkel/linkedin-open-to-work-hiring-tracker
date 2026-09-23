import type { AddScreenshotsRequest, AddScreenshotsResult, Audience } from '../../contracts/api.ts'
import { audienceTrackerRoutes } from '../app/AudienceTracker.ts'
import type { RoutesByAudience } from '../app/AudienceRouting.ts'
import type { Network } from '../shared/domain/Observation.ts'
import { defaultSettingsFor } from '../tracker/domain/DefaultSettings.ts'
import { memoryTrackerStore } from '../tracker/outbound/persistence/MemoryTrackerStore.ts'
import { demoNetworks } from './DemoNetworks.ts'
import { generateSampleNetwork } from './SampleNetwork.ts'

/** Fixed end date so every visitor sees the same static demo, whatever day it is. */
export const demoLatestScanDate = '2026-09-22'

/** Browser-safe: fictional contacts and followers with 180 days of made-up scans. Nothing comes from LinkedIn. */
export const demoTrackers = (): RoutesByAudience => ({
  contacts: sampleTrackerRoutes('contacts', demoNetworkFor('contacts')),
  followers: sampleTrackerRoutes('followers', demoNetworkFor('followers')),
})

function demoNetworkFor(audience: Audience): Network {
  return generateSampleNetwork({ latestScanDate: demoLatestScanDate, days: 180, ...demoNetworks[audience] })
}

/** Sample data held in memory: nothing is saved, and dropped screenshots are politely refused. */
export const sampleTrackerRoutes = (audience: Audience, network: Network) =>
  audienceTrackerRoutes(
    memoryTrackerStore(network, defaultSettingsFor(audience)),
    {
      addScreenshots: async (request) => nothingSaved(request),
      reprocessScan: async () => ({ message: 'Sample data has no screenshots to re-read.' }),
    },
    () => network.scans.map((scan) => scan.scanDate).sort().at(-1) ?? demoLatestScanDate,
  )

function nothingSaved(request: AddScreenshotsRequest): AddScreenshotsResult {
  return {
    saved: [],
    rejected: request.files.map((file) => ({ fileName: file.fileName, reason: 'Sample data only' })),
    analysisMessage: '',
    message: 'This is sample data, so screenshots are not saved. Run the app locally to add your own.',
  }
}
