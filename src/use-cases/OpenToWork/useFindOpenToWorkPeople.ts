import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { OpenToWorkPerson } from '@contracts/api'
import type { LoadStatus } from '@/components/AsyncContent'
import type { DataColumn, DataRow } from '@/components/DataTable'
import { formatPeople, formatShortDate } from '@/shared-formatting/formatMetric'
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
}

const columns: DataColumn[] = [
  { key: 'name', label: 'Person' },
  { key: 'headline', label: 'Title / headline' },
  { key: 'company', label: 'Company' },
  { key: 'firstSeen', label: 'First seen open' },
  { key: 'lastSeen', label: 'Last seen open' },
]

/** Everyone currently showing #OPENTOWORK, searchable by name or title. */
export function useFindOpenToWorkPeople(injectedRepository?: OpenToWorkRepository): OpenToWorkPeopleView {
  const { api } = useTrackerEnvironment()
  const repository = injectedRepository ?? openToWorkRepositoryFor(api)
  const [search, searchByNameOrTitle] = useState('')
  const query = useQuery({ queryKey: ['open-to-work-people'], queryFn: repository.people })
  const people = (query.data ?? []).filter((person) => matches(person, search))
  const table = useSortedRows(columns, people.map(toRow), { key: 'lastSeen', direction: 'desc' })

  return {
    ...loadStatusOf(query),
    resultSummary: `${formatPeople(people.length)} showing #OPENTOWORK`,
    search,
    searchByNameOrTitle,
    hasPeople: people.length > 0,
    showNobodyOpen: people.length === 0,
    ...table,
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
      firstSeen: { text: formatShortDate(person.firstSeenOpen), sortValue: person.firstSeenOpen },
      lastSeen: { text: formatShortDate(person.lastSeenOpen), sortValue: person.lastSeenOpen },
    },
  }
}
