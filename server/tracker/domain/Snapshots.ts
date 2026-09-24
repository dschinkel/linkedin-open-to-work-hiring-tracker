import type { Snapshot, SnapshotSummary } from '../../../contracts/api.ts'

const savedOn = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export function defaultSnapshotName(savedAt: Date, peopleCount: number): string {
  return `${savedOn.format(savedAt)} · ${peopleCount === 1 ? '1 person' : `${peopleCount.toLocaleString('en-US')} people`}`
}

export function summaryOf({ id, kind, name, createdAt, peopleCount }: Snapshot): SnapshotSummary {
  return { id, kind, name, createdAt, peopleCount }
}
