import type { Settings } from '../contracts/api.ts'
import type { Network } from './domain/observation.ts'

/**
 * Port: where one audience's tracker keeps its data. The real app uses SQLite (sqliteStore.ts);
 * the demo and tests use memory. Analytics never know which one they are talking to.
 */
export interface TrackerStore {
  readNetwork: () => Network
  /** Changes whenever the stored data changes, so computed analytics know when to refresh. */
  dataVersion: () => number
  readSettings: () => Settings
  saveSettings: (settings: Settings) => void
  /** Remembers a screenshot that was added to the inbox and is waiting to be analyzed. */
  recordWaitingScreenshot: (fileName: string) => void
  waitingScreenshotCount: () => number
}

/** In-memory store: the demo's fixed sample data and test fixtures. Nothing is written to disk. */
export function memoryStore(network: Network, initialSettings: Settings): TrackerStore {
  let settings = initialSettings
  const waiting = new Set<string>()
  return {
    readNetwork: () => network,
    dataVersion: () => 0,
    readSettings: () => settings,
    saveSettings: (next) => {
      settings = next
    },
    recordWaitingScreenshot: (fileName) => {
      waiting.add(fileName)
    },
    waitingScreenshotCount: () => waiting.size,
  }
}
