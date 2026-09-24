import type { Settings, Snapshot, SnapshotKind, SnapshotSummary } from '../../../../contracts/api.ts'
import type { Network, Observation, Person, Scan } from '../../../shared/domain/Observation.ts'

export interface AnalyzedDay {
  scan: Scan
  people: Person[]
  observations: Observation[]
}

export interface WaitingScreenshot {
  fileName: string
  addedAt: string
}

export interface TrackerStore {
  readNetwork: () => Network
  dataVersion: () => number
  readSettings: () => Settings
  saveSettings: (settings: Settings) => void
  recordWaitingScreenshot: (fileName: string) => void
  waitingScreenshots: () => WaitingScreenshot[]
  knowsScreenshot: (fileName: string) => boolean
  waitingScreenshotCount: () => number
  readDay: (scanDate: string) => AnalyzedDay | null
  readScan: (scanId: string) => AnalyzedDay | null
  saveAnalyzedDay: (day: AnalyzedDay) => void
  markScreenshotFailed: (fileName: string, reason: string) => void
  saveSnapshot: (snapshot: Snapshot) => void
  listSnapshots: (kind: SnapshotKind) => SnapshotSummary[]
  readSnapshot: (snapshotId: string) => Snapshot | null
  deleteSnapshot: (snapshotId: string) => boolean
  eraseAudience: () => void
}
