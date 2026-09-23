import type { Settings } from '../contracts/api.ts'

export const defaultSettings: Settings = {
  inboxDirectory: 'LinkedinScreenShots/',
  archiveDirectory: 'data/screenshots/',
  automaticProcessing: true,
  openToWorkThresholds: { open: 0.9, notOpen: 0.1 },
  hiringThresholds: { hiring: 0.9, notHiring: 0.1 },
  visionFallback: false,
  scanFrequency: 'daily',
  retention: 'forever',
}
