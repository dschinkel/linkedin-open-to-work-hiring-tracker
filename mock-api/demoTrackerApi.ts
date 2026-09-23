import { defaultSettings } from './defaultSettings.ts'
import { generateSampleNetwork } from './seed/generateSampleNetwork.ts'
import { createTrackerApi, type TrackerApi } from './trackerApi.ts'

/** Fixed end date so every visitor sees the same static demo, whatever day it is. */
export const demoLatestScanDate = '2026-09-22'

/** Browser-safe: 500 fictional people and 180 days of made-up scans. Nothing comes from LinkedIn. */
export function createDemoTrackerApi(): TrackerApi {
  const network = generateSampleNetwork({ latestScanDate: demoLatestScanDate, days: 180, peopleCount: 500, seed: 2026 })
  return createTrackerApi(network, defaultSettings, { analyzeMessage: 'Demo: screenshots are not analyzed here.' })
}
