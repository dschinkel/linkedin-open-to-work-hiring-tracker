import type { Snapshot, SnapshotSummary } from '../../../contracts/api.ts'

const savedOn = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

/** What an unnamed snapshot is called: the day it was saved and how many people it holds, e.g. "Sep 23, 2026 · 8 people". */
export function defaultSnapshotName(savedAt: Date, peopleCount: number): string {
  return `${savedOn.format(savedAt)} · ${peopleCount === 1 ? '1 person' : `${peopleCount.toLocaleString('en-US')} people`}`
}

/** A snapshot as listed: everything but its people. */
export function summaryOf({ id, kind, name, createdAt, peopleCount }: Snapshot): SnapshotSummary {
  return { id, kind, name, createdAt, peopleCount }
}
