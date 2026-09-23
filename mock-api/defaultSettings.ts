import type { Audience, Settings } from '../contracts/api.ts'

/** Each audience keeps its own inbox and archive, so contacts and followers never mix. */
export function defaultSettingsFor(audience: Audience): Settings {
  return {
    inboxDirectory: `LinkedinScreenShots/${audience}/`,
    archiveDirectory: `data/screenshots/${audience}/`,
    automaticProcessing: true,
    openToWorkThresholds: { open: 0.9, notOpen: 0.1 },
    hiringThresholds: { hiring: 0.9, notHiring: 0.1 },
    visionFallback: false,
    scanFrequency: 'daily',
    retention: 'forever',
  }
}
