import type { Audience } from '../contracts/api.ts'
import type { AudienceApis } from './audienceRoutes.ts'
import { defaultSettingsFor } from './defaultSettings.ts'
import { demoNetworks } from './demoNetworks.ts'
import { generateSampleNetwork } from './seed/generateSampleNetwork.ts'
import { createTrackerApi, type TrackerApi } from './trackerApi.ts'
import { memoryStore } from './trackerStore.ts'

/** Fixed end date so every visitor sees the same static demo, whatever day it is. */
export const demoLatestScanDate = '2026-09-22'


/** Browser-safe: fictional contacts and followers with 180 days of made-up scans. Nothing comes from LinkedIn. */
export function createDemoTrackerApis(): AudienceApis {
  return { contacts: demoTrackerFor('contacts'), followers: demoTrackerFor('followers') }
}

function demoTrackerFor(audience: Audience): TrackerApi {
  const network = generateSampleNetwork({ latestScanDate: demoLatestScanDate, days: 180, ...demoNetworks[audience] })
  return createTrackerApi(memoryStore(network, defaultSettingsFor(audience)), {})
}
