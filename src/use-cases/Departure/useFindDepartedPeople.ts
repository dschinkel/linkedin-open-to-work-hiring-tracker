import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { DepartedPerson } from '@contracts/api'
import type { LoadStatus } from '@/components/AsyncContent'
import type { DataColumn, DataRow } from '@/components/DataTable'
import { formatPeople, formatShortDate } from '@/shared-formatting/formatMetric'
import { useTrackerEnvironment } from '@/shared-repositories/trackerEnvironment'
import { loadStatusOf } from '@/shared-state/loadStatus'
import { type SortedRows, useSortedRows } from '@/shared-state/useSortedRows'
import { type DepartureRepository, departureRepositoryFor } from './DepartureRepository'
import { departureTitles } from './departureWording'

export interface DepartedPeopleView extends SortedRows {
  status: LoadStatus
  errorMessage: string
  title: string
  explanation: string
  caveat: string
  resultSummary: string
  search: string
  searchByName: (search: string) => void
  hasPeople: boolean
  showNobodyLeft: boolean
}

const columns: DataColumn[] = [
  { key: 'name', label: 'Person' },
  { key: 'headline', label: 'Title / headline' },
  { key: 'company', label: 'Company' },
  { key: 'firstSeen', label: 'First seen' },
  { key: 'lastSeen', label: 'Last seen' },
  { key: 'missed', label: 'Scans missed', isNumeric: true },
  { key: 'frames', label: 'When last seen' },
]

/** Unfollowers or past contacts: people seen before who are missing from the latest scans. */
export function useFindDepartedPeople(injectedRepository?: DepartureRepository): DepartedPeopleView {
  const { api, audience } = useTrackerEnvironment()
  const repository = injectedRepository ?? departureRepositoryFor(api)
  const [search, searchByName] = useState('')
  const query = useQuery({ queryKey: ['departed'], queryFn: repository.departed })
  const threshold = query.data?.scansMissedThreshold ?? 3
  const people = (query.data?.people ?? []).filter((person) => matchesName(person, search))
  const table = useSortedRows(columns, people.map(toRow), { key: 'lastSeen', direction: 'desc' })

  return {
    ...loadStatusOf(query),
    title: departureTitles[audience],
    explanation: `Seen in earlier scans but missing from the last ${threshold} scans in a row.`,
    caveat: 'This is only reliable when every scan covers your whole list; someone may just have been scrolled past. Anyone who shows up again drops off this list, and it updates with every new day of screenshots.',
    resultSummary: formatPeople(people.length),
    search,
    searchByName,
    hasPeople: people.length > 0,
    showNobodyLeft: people.length === 0,
    ...table,
  }
}

function matchesName(person: DepartedPerson, search: string): boolean {
  return person.displayName.toLowerCase().includes(search.trim().toLowerCase())
}

function toRow(person: DepartedPerson): DataRow {
  return {
    id: person.personId,
    cells: {
      name: { text: person.displayName },
      headline: { text: person.headline ?? '' },
      company: { text: person.companyName ?? 'Company not visible' },
      firstSeen: { text: formatShortDate(person.firstSeen), sortValue: person.firstSeen },
      lastSeen: { text: formatShortDate(person.lastSeen), sortValue: person.lastSeen },
      missed: { text: String(person.scansMissed), sortValue: person.scansMissed },
      frames: { text: describeFramesWhenLastSeen(person) },
    },
  }
}

function describeFramesWhenLastSeen(person: DepartedPerson): string {
  const frames = [person.wasOpenToWorkWhenLastSeen && '#OPEN_TO_WORK', person.wasHiringWhenLastSeen && '#HIRING'].filter(Boolean)
  return frames.length > 0 ? frames.join(', ') : 'No frame'
}
