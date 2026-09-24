import type { Settings } from '../../../../contracts/api.ts'
import type { Network, Observation, Person, Scan } from '../../../shared/domain/Observation.ts'

/** Everything learned from one day's screenshots for one audience. */
export interface AnalyzedDay {
  scan: Scan
  people: Person[]
  observations: Observation[]
}

export interface WaitingScreenshot {
  fileName: string
  addedAt: string
}

/**
 * Port: where one audience's tracker keeps its data. The real app uses SQLite (SqliteTrackerStore.ts);
 * the demo and tests use memory (MemoryTrackerStore.ts). Use cases never know which one they talk to.
 */
export interface TrackerStore {
  readNetwork: () => Network
  /** Changes whenever the stored data changes, so computed analytics know when to refresh. */
  dataVersion: () => number
  readSettings: () => Settings
  saveSettings: (settings: Settings) => void
  /** Remembers a screenshot that was added to the inbox and is waiting to be analyzed. */
  recordWaitingScreenshot: (fileName: string) => void
  waitingScreenshots: () => WaitingScreenshot[]
  /** True for any screenshot this audience has seen before: waiting, imported, or failed. */
  knowsScreenshot: (fileName: string) => boolean
  waitingScreenshotCount: () => number
  /** Everything already saved for a day, so later uploads that day are merged in rather than replacing it. */
  readDay: (scanDate: string) => AnalyzedDay | null
  /** One saved scan with everyone observed in it. Null when this audience has no such scan. */
  readScan: (scanId: string) => AnalyzedDay | null
  /** Saves (or replaces) one analyzed day in a single step; its screenshots stop being "waiting". */
  saveAnalyzedDay: (day: AnalyzedDay) => void
  /** A screenshot that could not be read stays listed, marked failed with the reason. */
  markScreenshotFailed: (fileName: string, reason: string) => void
}
