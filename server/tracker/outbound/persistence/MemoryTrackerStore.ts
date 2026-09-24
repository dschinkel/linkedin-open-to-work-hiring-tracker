import type { Settings, Snapshot } from '../../../../contracts/api.ts'
import { summaryOf } from '../../domain/Snapshots.ts'
import type { Network, Scan } from '../../../shared/domain/Observation.ts'
import type { AnalyzedDay, TrackerStore, WaitingScreenshot } from './TrackerStore.ts'

export const memoryTrackerStore = (initialNetwork: Network, initialSettings: Settings): TrackerStore => {
  let network = initialNetwork
  let settings = initialSettings
  let version = 0
  const waiting = new Map<string, WaitingScreenshot>()
  const seen = new Set<string>()
  const snapshots = new Map<string, Snapshot>()

  const saveAnalyzedDay = ({ scan, people, observations }: AnalyzedDay): void => {
    const peopleIds = new Set(people.map((person) => person.id))
    const replacedScanIds = new Set(network.scans.filter((existing) => existing.scanDate === scan.scanDate).map((existing) => existing.id))
    network = {
      people: [...network.people.filter((person) => !peopleIds.has(person.id)), ...people],
      scans: [...network.scans.filter((existing) => !replacedScanIds.has(existing.id)), scan],
      observations: [...network.observations.filter((observation) => !replacedScanIds.has(observation.scanId)), ...observations],
    }
    for (const screenshot of scan.screenshots) waiting.delete(screenshot.fileName)
    version += 1
  }

  const readDay = (scanDate: string): AnalyzedDay | null => readSavedScan(network.scans.find((existing) => existing.scanDate === scanDate))

  const readSavedScan = (scan: Scan | undefined): AnalyzedDay | null => {
    if (!scan) return null
    const observations = network.observations.filter((observation) => observation.scanId === scan.id)
    const personIds = new Set(observations.map((observation) => observation.personId))
    return { scan, observations, people: network.people.filter((person) => personIds.has(person.id)) }
  }

  return {
    readNetwork: () => network,
    dataVersion: () => version,
    readSettings: () => settings,
    saveSettings: (next) => {
      settings = next
      version += 1
    },
    recordWaitingScreenshot: (fileName) => {
      if (!seen.has(fileName)) waiting.set(fileName, { fileName, addedAt: new Date().toISOString() })
      seen.add(fileName)
      version += 1
    },
    waitingScreenshots: () => [...waiting.values()],
    waitingScreenshotCount: () => waiting.size,
    knowsScreenshot: (fileName) => seen.has(fileName) || network.scans.some((scan) => scan.screenshots.some((screenshot) => screenshot.fileName === fileName)),
    readDay,
    readScan: (scanId) => readSavedScan(network.scans.find((existing) => existing.id === scanId)),
    saveAnalyzedDay,
    markScreenshotFailed: (fileName) => {
      waiting.delete(fileName)
      version += 1
    },
    saveSnapshot: (snapshot) => void snapshots.set(snapshot.id, snapshot),
    listSnapshots: (kind) =>
      [...snapshots.values()]
        .filter((snapshot) => snapshot.kind === kind)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(summaryOf),
    readSnapshot: (snapshotId) => snapshots.get(snapshotId) ?? null,
    deleteSnapshot: (snapshotId) => snapshots.delete(snapshotId),
    eraseAudience: () => {
      network = { people: [], scans: [], observations: [] }
      settings = initialSettings
      waiting.clear()
      seen.clear()
      snapshots.clear()
      version += 1
    },
  }
}
