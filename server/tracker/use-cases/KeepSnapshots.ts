import type { HiringPeopleQuery, SaveSnapshotRequest, Snapshot, SnapshotKind, SnapshotList, SnapshotSummary } from '../../../contracts/api.ts'
import { hiringPeopleQuerySchema, saveSnapshotRequestSchema } from '../../../contracts/api.ts'
import { filterHiringPeople } from '../domain/HiringPeople.ts'
import { listOpenToWorkPeople } from '../domain/OpenToWorkPeople.ts'
import { defaultSnapshotName, summaryOf } from '../domain/Snapshots.ts'
import type { TrackerPorts } from '../domain/TrackerAnalytics.ts'

export interface SnapshotPorts extends TrackerPorts {
  now: () => Date
  newSnapshotId: () => string
}

/**
 * Saved copies of the Open to Work and Hiring lists. The list is taken here, from the saved scans, so a
 * snapshot is exactly what the list said at that moment; the Hiring list is taken through the filters in effect.
 */
export const keepSnapshots = ({ analytics, trackerStore, now, newSnapshotId }: SnapshotPorts) => {
  const takeSnapshot = (kind: SnapshotKind, filters: HiringPeopleQuery, name: string): Snapshot => {
    const savedAt = now()
    const identity = { id: newSnapshotId(), createdAt: savedAt.toISOString() }
    const named = <People extends unknown[]>(people: People) => ({ ...identity, name: name || defaultSnapshotName(savedAt, people.length), peopleCount: people.length, people })
    if (kind === 'hiring') return { kind, filters, ...named(filterHiringPeople(analytics().hiringPeople, filters)) }
    return { kind, ...named(listOpenToWorkPeople(analytics().index)) }
  }

  return {
    listSnapshots: (kind: SnapshotKind): SnapshotList => ({ snapshots: trackerStore.listSnapshots(kind) }),
    saveSnapshot: (kind: SnapshotKind, request: SaveSnapshotRequest): SnapshotSummary => {
      const { name, filters } = saveSnapshotRequestSchema.parse(request)
      const snapshot = takeSnapshot(kind, filters ?? hiringPeopleQuerySchema.parse({}), name)
      trackerStore.saveSnapshot(snapshot)
      return summaryOf(snapshot)
    },
    viewSnapshot: (snapshotId: string): Snapshot | null => trackerStore.readSnapshot(snapshotId),
    deleteSnapshot: (snapshotId: string): SnapshotSummary | null => {
      const snapshot = trackerStore.readSnapshot(snapshotId)
      if (!snapshot || !trackerStore.deleteSnapshot(snapshotId)) return null
      return summaryOf(snapshot)
    },
  }
}
