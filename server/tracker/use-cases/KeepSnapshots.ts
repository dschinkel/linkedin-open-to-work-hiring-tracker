import type { HiringPeopleQuery, HiringPerson, OpenToWorkPerson, SaveSnapshotRequest, Snapshot, SnapshotKind, SnapshotList, SnapshotSummary } from '../../../contracts/api.ts'
import { hiringPeopleQuerySchema, saveSnapshotRequestSchema } from '../../../contracts/api.ts'
import { filterHiringPeople } from '../domain/HiringPeople.ts'
import { defaultSnapshotName, summaryOf } from '../domain/Snapshots.ts'
import type { SnapshotStore } from '../outbound/persistence/TrackerStore.ts'

export interface SnapshotPorts {
  snapshotStore: SnapshotStore
  openToWorkPeople: () => OpenToWorkPerson[]
  hiringPeople: () => HiringPerson[]
  now: () => Date
  newSnapshotId: () => string
}

export const keepSnapshots = ({ snapshotStore, openToWorkPeople, hiringPeople, now, newSnapshotId }: SnapshotPorts) => {
  const takeSnapshot = (kind: SnapshotKind, filters: HiringPeopleQuery, name: string): Snapshot => {
    const savedAt = now()
    const identity = { id: newSnapshotId(), createdAt: savedAt.toISOString() }
    const named = <People extends unknown[]>(people: People) => ({ ...identity, name: name || defaultSnapshotName(savedAt, people.length), peopleCount: people.length, people })
    if (kind === 'hiring') return { kind, filters, ...named(filterHiringPeople(hiringPeople(), filters)) }
    return { kind, ...named(openToWorkPeople()) }
  }

  return {
    listSnapshots: (kind: SnapshotKind): SnapshotList => ({ snapshots: snapshotStore.listSnapshots(kind) }),
    saveSnapshot: (kind: SnapshotKind, request: SaveSnapshotRequest): SnapshotSummary => {
      const { name, filters } = saveSnapshotRequestSchema.parse(request)
      const snapshot = takeSnapshot(kind, filters ?? hiringPeopleQuerySchema.parse({}), name)
      snapshotStore.saveSnapshot(snapshot)
      return summaryOf(snapshot)
    },
    viewSnapshot: (snapshotId: string): Snapshot | null => snapshotStore.readSnapshot(snapshotId),
    deleteSnapshot: (snapshotId: string): SnapshotSummary | null => {
      const snapshot = snapshotStore.readSnapshot(snapshotId)
      if (!snapshot || !snapshotStore.deleteSnapshot(snapshotId)) return null
      return summaryOf(snapshot)
    },
  }
}
