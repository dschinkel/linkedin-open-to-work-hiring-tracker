import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { OpenToWorkPerson } from '@contracts/api'
import type { LoadStatus } from '@/components/AsyncContent'
import type { DataColumn, DataRow } from '@/components/DataTable'
import { exportTableOf, type ListExporter, localToday } from '@/shared-exports/listExport'
import { type ExportListView, useExportList } from '@/shared-exports/useExportList'
import { formatPeople, formatShortDate, formatTimeShowingFrame } from '@/shared-formatting/formatMetric'
import { useTrackerEnvironment } from '@/shared-repositories/trackerEnvironment'
import { loadStatusOf } from '@/shared-state/loadStatus'
import { type SortedRows, useSortedRows } from '@/shared-state/useSortedRows'
import { type OpenToWorkRepository, openToWorkRepositoryFor } from './OpenToWorkRepository'

export interface OpenToWorkPeopleView extends SortedRows {
  status: LoadStatus
  errorMessage: string
  resultSummary: string
  search: string
  searchByNameOrTitle: (search: string) => void
  hasPeople: boolean
  showNobodyOpen: boolean
  /** Saves the list as shown: current search and sort, same columns. */
  exporting: ExportListView
}

const columns: DataColumn[] = [
  { key: 'name', label: 'Person' },
  { key: 'headline', label: 'Title / headline' },
  { key: 'company', label: 'Company' },
  { key: 'openSince', label: 'Open since' },
  { key: 'timeOpen', label: 'Time open' },
  { key: 'lastSeen', label: 'Last seen open' },
]

/** Everyone currently showing #OPENTOWORK, searchable by name or title. */
export function useFindOpenToWorkPeople(injectedRepository?: OpenToWorkRepository, exporter?: ListExporter): OpenToWorkPeopleView {
  const { api } = useTrackerEnvironment()
  const repository = injectedRepository ?? openToWorkRepositoryFor(api)
  const [search, searchByNameOrTitle] = useState('')
  const query = useQuery({ queryKey: ['open-to-work-people'], queryFn: repository.people })
  const people = (query.data ?? []).filter((person) => matches(person, search))
  const table = useSortedRows(columns, people.map(toRow), { key: 'lastSeen', direction: 'desc' })
  const exporting = useExportList(() => ({ list: { slug: 'open-to-work', title: 'Open to Work' }, date: localToday(), ...exportTableOf(table.columns, table.rows) }), exporter)

  return {
    ...loadStatusOf(query),
    resultSummary: `${formatPeople(people.length)} showing #OPENTOWORK`,
    search,
    searchByNameOrTitle,
    hasPeople: people.length > 0,
    showNobodyOpen: people.length === 0,
    ...table,
    exporting,
  }
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
