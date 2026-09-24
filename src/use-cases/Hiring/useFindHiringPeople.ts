import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { CompanyHiring, CompanyKnownFilter, HiringPeopleQuery, HiringPerson, HiringStatusFilter } from '@contracts/api'
import type { LoadStatus } from '@/components/AsyncContent'
import type { DataColumn, DataRow } from '@/components/DataTable'
import type { DefinitionRow } from '@/components/DefinitionList'
import type { PickerOption } from '@/components/OptionPicker'
import { formatPeople } from '@/shared-formatting/formatMetric'
import { useTrackerEnvironment } from '@/shared-repositories/trackerEnvironment'
import { loadStatusOf } from '@/shared-state/loadStatus'
import { type SortedRows, useSortedRows } from '@/shared-state/useSortedRows'
import { describeHiringPerson } from './describeHiring'
import { type HiringRepository, hiringRepositoryFor } from './HiringRepository'

export interface HiringPeopleView extends SortedRows {
  status: LoadStatus
  errorMessage: string
  filters: HiringPeopleQuery
  searchByName: (search: string) => void
  filterByCompany: (company: string) => void
  filterByStatus: (status: HiringStatusFilter) => void
  filterByCompanyKnown: (companyKnown: CompanyKnownFilter) => void
  statusOptions: PickerOption<HiringStatusFilter>[]
  companyKnownOptions: PickerOption<CompanyKnownFilter>[]
  resultSummary: string
  hasPeople: boolean
  showNoMatches: boolean
  companyRows: DefinitionRow[]
}

const statusOptions: PickerOption<HiringStatusFilter>[] = [
  { value: 'current', label: 'Currently hiring' },
  { value: 'previous', label: 'Previously hiring' },
  { value: 'all', label: 'Everyone ever hiring' },
]

const companyKnownOptions: PickerOption<CompanyKnownFilter>[] = [
  { value: 'all', label: 'Any company' },
  { value: 'known', label: 'Company known' },
  { value: 'unknown', label: 'Company not visible' },
]

const columns: DataColumn[] = [
  { key: 'name', label: 'Person' },
  { key: 'headline', label: 'Title / headline' },
  { key: 'company', label: 'Company' },
  { key: 'since', label: 'Hiring since' },
  { key: 'days', label: 'Time hiring' },
  { key: 'lastSeen', label: 'Last seen hiring' },
  { key: 'recency', label: 'Recency' },
]

const initialFilters: HiringPeopleQuery = { search: '', company: '', status: 'current', companyKnown: 'all', sort: 'lastSeen' }

/** Who's Hiring: searchable, filterable list of people seen with the public #HIRING frame. */
export function useFindHiringPeople(injectedRepository?: HiringRepository): HiringPeopleView {
  const { api } = useTrackerEnvironment()
  const repository = injectedRepository ?? hiringRepositoryFor(api)
  const [filters, setFilters] = useState<HiringPeopleQuery>(initialFilters)
  const people = useQuery({ queryKey: ['hiring-people', filters], queryFn: () => repository.people(filters), placeholderData: keepPreviousData })
  const companies = useQuery({ queryKey: ['hiring-companies'], queryFn: repository.companies })
  const table = useSortedRows(columns, (people.data ?? []).map(toTableRow), { key: 'lastSeen', direction: 'desc' })

  function updateFilter<Key extends keyof HiringPeopleQuery>(key: Key) {
    return (value: HiringPeopleQuery[Key]) => setFilters((current) => ({ ...current, [key]: value }))
  }

  return {
    ...loadStatusOf(people),
    filters,
    searchByName: updateFilter('search'),
    filterByCompany: updateFilter('company'),
    filterByStatus: updateFilter('status'),
    filterByCompanyKnown: updateFilter('companyKnown'),
    statusOptions,
    companyKnownOptions,
    resultSummary: formatPeople(table.rows.length),
    hasPeople: table.rows.length > 0,
    showNoMatches: table.rows.length === 0,
    ...table,
    companyRows: describeCompanies(companies.data),
  }
}

function toTableRow(person: HiringPerson): DataRow {
  const row = describeHiringPerson(person)
  return {
    id: row.personId,
    isMuted: row.isStale,
    cells: {
      name: { text: row.name },
      headline: { text: row.headline },
      company: { text: row.company, note: row.companyNeedsReview ? 'review' : undefined },
      since: { text: row.hiringSince, sortValue: person.hiringSince },
      days: { text: row.timeHiring, sortValue: person.daysHiring },
      lastSeen: { text: row.lastSeenHiring, sortValue: person.lastSeenHiring },
      recency: { text: row.recency },
    },
  }
}

function describeCompanies(companies: CompanyHiring | undefined): DefinitionRow[] {
  if (!companies) return []
  return [
    ...companies.companies.map((company) => ({ label: company.companyName, value: formatPeople(company.peopleCount) })),
    { label: 'Company needs review', value: formatPeople(companies.needsReviewCount) },
    { label: 'Company not visible', value: formatPeople(companies.notVisibleCount) },
  ]
}
