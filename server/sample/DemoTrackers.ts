import type { AddScreenshotsRequest, AddScreenshotsResult, Audience } from '../../contracts/api.ts'
import { audienceTrackerRoutes } from '../app/AudienceTracker.ts'
import type { RoutesByAudience } from '../app/AudienceRouting.ts'
import type { Network } from '../shared/domain/Observation.ts'
import { defaultSettingsFor } from '../tracker/domain/DefaultSettings.ts'
import { memoryTrackerStore } from '../tracker/outbound/persistence/MemoryTrackerStore.ts'
import { demoNetworks } from './DemoNetworks.ts'
import { generateSampleNetwork } from './SampleNetwork.ts'

export const demoLatestScanDate = '2026-09-22'

export const demoTrackers = (): RoutesByAudience => ({
  contacts: sampleTrackerRoutes('contacts', demoNetworkFor('contacts')),
  followers: sampleTrackerRoutes('followers', demoNetworkFor('followers')),
})

function demoNetworkFor(audience: Audience): Network {
  return generateSampleNetwork({ latestScanDate: demoLatestScanDate, days: 180, ...demoNetworks[audience] })
}

export const sampleTrackerRoutes = (audience: Audience, network: Network) =>
  audienceTrackerRoutes({
    trackerStore: memoryTrackerStore(network, defaultSettingsFor(audience)),
    screenshots: {
      addScreenshots: async (request) => nothingSaved(request),
      reprocessScan: async () => ({ message: 'Sample data has no screenshots to re-read.' }),
    },
    clearAllData: nothingToClear,
    clearAudienceData: nothingToClear,
    today: () => network.scans.map((scan) => scan.scanDate).sort().at(-1) ?? demoLatestScanDate,
  })

async function nothingToClear() {
  return { message: 'This is sample data, so there is nothing of yours to clear.' }
}

function nothingSaved(request: AddScreenshotsRequest): AddScreenshotsResult {
  return {
    saved: [],
    rejected: request.files.map((file) => ({ fileName: file.fileName, reason: 'Sample data only' })),
    analysisMessage: '',
    importedCount: 0,
    failedCount: 0,
    peopleInScan: 0,
    message: 'This is sample data, so screenshots are not saved. Run the app locally to add your own.',
  }
}
