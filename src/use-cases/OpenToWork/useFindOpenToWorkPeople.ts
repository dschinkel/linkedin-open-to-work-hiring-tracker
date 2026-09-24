import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { OpenToWorkPerson, Snapshot } from '@contracts/api'
import type { LoadStatus } from '@/components/AsyncContent'
import type { DataColumn, DataRow } from '@/components/DataTable'
import { exportTableOf, type ListExporter, localToday } from '@/shared-exports/listExport'
import { type ExportListView, useExportList } from '@/shared-exports/useExportList'
import { formatPeople, formatShortDate, formatTimeShowingFrame } from '@/shared-formatting/formatMetric'
import { useTrackerEnvironment } from '@/shared-repositories/trackerEnvironment'
import { loadStatusOf } from '@/shared-state/loadStatus'
import { type SortedRows, sortRows, useSortedRows } from '@/shared-state/useSortedRows'
import type { SnapshotRepository } from '@/use-cases/Snapshots/SnapshotRepository'
import { type KeepSnapshotsView, useKeepSnapshots } from '@/use-cases/Snapshots/useKeepSnapshots'
import { type OpenToWorkRepository, openToWorkRepositoryFor } from './OpenToWorkRepository'

export interface OpenToWorkPeopleView extends SortedRows {
  status: LoadStatus
  errorMessage: string
  resultSummary: string
  search: string
  searchByNameOrTitle: (search: string) => void
  hasPeople: boolean
  showNobodyOpen: boolean
  /** Saves the list as shown: current search and sort, same columns. A snapshot on show is exported as that snapshot. */
  exporting: ExportListView
  /** Saved copies of this list; one can be shown in place of the current list. */
  snapshots: KeepSnapshotsView
}

const columns: DataColumn[] = [
  { key: 'name', label: 'Person' },
  { key: 'headline', label: 'Title / headline' },
  { key: 'company', label: 'Company' },
  { key: 'openSince', label: 'Open since' },
  { key: 'timeOpen', label: 'Time open' },
  { key: 'lastSeen', label: 'Last seen open' },
]

const initialSort = { key: 'lastSeen', direction: 'desc' } as const
const openToWorkList = { slug: 'open-to-work', title: 'Open to Work' }

/** Everyone currently showing #OPENTOWORK (or everyone in a saved snapshot), searchable by name or title. */
export function useFindOpenToWorkPeople(injectedRepository?: OpenToWorkRepository, exporter?: ListExporter, snapshotRepository?: SnapshotRepository): OpenToWorkPeopleView {
  const { api } = useTrackerEnvironment()
  const repository = injectedRepository ?? openToWorkRepositoryFor(api)
  const [search, searchByNameOrTitle] = useState('')
  const query = useQuery({ queryKey: ['open-to-work-people'], queryFn: repository.people })
  const snapshots = useKeepSnapshots({ kind: 'open-to-work', list: openToWorkList, tableOf: tableOfSnapshot }, snapshotRepository, exporter)
  const listed = snapshots.isViewingSnapshot ? openToWorkPeopleIn(snapshots.viewedSnapshot) : (query.data ?? [])
  const people = listed.filter((person) => matches(person, search))
  const table = useSortedRows(columns, people.map(toRow), initialSort)
  const exporting = useExportList(() => ({ ...(snapshots.viewedExportName ?? { list: openToWorkList, date: localToday() }), ...exportTableOf(table.columns, table.rows) }), exporter)

  return {
    ...(snapshots.isViewingSnapshot ? snapshots.viewedStatus : loadStatusOf(query)),
    resultSummary: `${formatPeople(people.length)} showing #OPENTOWORK`,
    search,
    searchByNameOrTitle,
    hasPeople: people.length > 0,
    showNobodyOpen: people.length === 0,
    ...table,
    exporting,
    snapshots,
  }
}

function openToWorkPeopleIn(snapshot: Snapshot | null): OpenToWorkPerson[] {
  return snapshot?.kind === 'open-to-work' ? snapshot.people : []
}

function tableOfSnapshot(snapshot: Snapshot) {
  return exportTableOf(columns, sortRows(openToWorkPeopleIn(snapshot).map(toRow), initialSort))
}

function matches(person: OpenToWorkPerson, search: string): boolean {
  const wanted = search.trim().toLowerCase()
  return `${person.displayName} ${person.headline ?? ''}`.toLowerCase().includes(wanted)
}

function toRow(person: OpenToWorkPerson): DataRow {
  return {
    id: person.personId,
    isMuted: !person.wasObservedInLatestScan,
    cells: {
      name: { text: person.displayName },
      headline: { text: person.headline ?? '' },
      company: { text: person.companyName ?? 'Company not visible' },
      openSince: { text: formatShortDate(person.openSince), sortValue: person.openSince },
      timeOpen: { text: formatTimeShowingFrame(person.daysOpen, person.scansSeenOpen), sortValue: person.daysOpen },
      lastSeen: { text: formatShortDate(person.lastSeenOpen), sortValue: person.lastSeenOpen },
    },
  }
}
