import type { AddScreenshotsRequest, AddScreenshotsResult, Audience } from '../../contracts/api.ts'
import { allAudiencesTrackerRoutes } from '../app/AllAudiencesTracker.ts'
import { audienceTrackerRoutes } from '../app/AudienceTracker.ts'
import type { RoutesByAudience } from '../app/AudienceRouting.ts'
import type { Network } from '../shared/domain/Observation.ts'
import { defaultSettingsFor } from '../tracker/domain/DefaultSettings.ts'
import { trackerAnalytics } from '../tracker/domain/TrackerAnalytics.ts'
import { memorySnapshotStore, memoryTrackerStore } from '../tracker/outbound/persistence/MemoryTrackerStore.ts'
import type { TrackerStore } from '../tracker/outbound/persistence/TrackerStore.ts'
import { demoNetworks } from './DemoNetworks.ts'
import { generateSampleNetwork } from './SampleNetwork.ts'

export const demoLatestScanDate = '2026-09-22'

export const demoTrackers = (): RoutesByAudience => sampleTrackers({ contacts: demoNetworkFor('contacts'), followers: demoNetworkFor('followers') })

function demoNetworkFor(audience: Audience): Network {
  return generateSampleNetwork({ latestScanDate: demoLatestScanDate, days: 180, ...demoNetworks[audience] })
}

export function sampleTrackers(networks: Record<Audience, Network>): RoutesByAudience {
  const trackerStores = { followers: sampleStore('followers', networks.followers), contacts: sampleStore('contacts', networks.contacts) }
  const analytics = { followers: trackerAnalytics(trackerStores.followers), contacts: trackerAnalytics(trackerStores.contacts) }
  return {
    followers: sampleAudienceRoutes(trackerStores.followers, networks.followers, analytics.followers),
    contacts: sampleAudienceRoutes(trackerStores.contacts, networks.contacts, analytics.contacts),
    all: allAudiencesTrackerRoutes({ trackerStores, analytics, snapshotStore: memorySnapshotStore() }),
  }
}

export const sampleTrackerRoutes = (audience: Audience, network: Network) => sampleAudienceRoutes(sampleStore(audience, network), network)

function sampleStore(audience: Audience, network: Network): TrackerStore {
  return memoryTrackerStore(network, defaultSettingsFor(audience))
}

function sampleAudienceRoutes(trackerStore: TrackerStore, network: Network, analytics = trackerAnalytics(trackerStore)) {
  return audienceTrackerRoutes({
    trackerStore,
    analytics,
    screenshots: {
      addScreenshots: async (request) => nothingSaved(request),
      reprocessScan: async () => ({ message: 'Sample data has no screenshots to re-read.' }),
    },
    clearAllData: nothingToClear,
    clearAudienceData: nothingToClear,
    today: () => network.scans.map((scan) => scan.scanDate).sort().at(-1) ?? demoLatestScanDate,
  })
}

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
