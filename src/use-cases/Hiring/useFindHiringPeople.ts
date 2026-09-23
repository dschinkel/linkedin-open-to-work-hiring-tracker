import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { CompanyHiring, CompanyKnownFilter, HiringPeopleQuery, HiringSort, HiringStatusFilter } from '@contracts/api'
import type { LoadStatus } from '@/components/AsyncContent'
import type { DataColumn, DataRow } from '@/components/DataTable'
import type { DefinitionRow } from '@/components/DefinitionList'
import type { PickerOption } from '@/components/OptionPicker'
import { formatCount } from '@/shared-formatting/formatMetric'
import { useTrackerEnvironment } from '@/shared-repositories/trackerEnvironment'
import { loadStatusOf } from '@/shared-state/loadStatus'
import { describeHiringPerson, type HiringPersonRow } from './describeHiring'
import { type HiringRepository, hiringRepositoryFor } from './HiringRepository'

export interface HiringPeopleView {
  status: LoadStatus
  errorMessage: string
  filters: HiringPeopleQuery
  searchByName: (search: string) => void
  filterByCompany: (company: string) => void
  filterByStatus: (status: HiringStatusFilter) => void
  filterByCompanyKnown: (companyKnown: CompanyKnownFilter) => void
  sortBy: (sort: HiringSort) => void
  statusOptions: PickerOption<HiringStatusFilter>[]
  companyKnownOptions: PickerOption<CompanyKnownFilter>[]
  sortOptions: PickerOption<HiringSort>[]
  resultSummary: string
  hasPeople: boolean
  showNoMatches: boolean
  columns: DataColumn[]
  rows: DataRow[]
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

const sortOptions: PickerOption<HiringSort>[] = [
  { value: 'lastSeen', label: 'Last seen hiring' },
  { value: 'firstSeen', label: 'First seen hiring' },
  { value: 'duration', label: 'Days observed hiring' },
  { value: 'name', label: 'Name' },
]

const columns: DataColumn[] = [
  { key: 'name', label: 'Person' },
  { key: 'headline', label: 'Title / headline' },
  { key: 'company', label: 'Company' },
  { key: 'firstSeen', label: 'First seen hiring' },
  { key: 'lastSeen', label: 'Last seen hiring' },
  { key: 'days', label: 'Days observed', isNumeric: true },
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
  const rows = (people.data ?? []).map((person) => describeHiringPerson(person))

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
    sortBy: updateFilter('sort'),
    statusOptions,
    companyKnownOptions,
    sortOptions,
    resultSummary: `${formatCount(rows.length)} people`,
    hasPeople: rows.length > 0,
    showNoMatches: rows.length === 0,
    columns,
    rows: rows.map(toTableRow),
    companyRows: describeCompanies(companies.data),
  }
}

function toTableRow(person: HiringPersonRow): DataRow {
  return {
    id: person.personId,
    isMuted: person.isStale,
    cells: {
      name: { text: person.name },
      headline: { text: person.headline },
      company: { text: person.company, note: person.companyNeedsReview ? 'review' : undefined },
      firstSeen: { text: person.firstSeenHiring },
      lastSeen: { text: person.lastSeenHiring },
      days: { text: person.daysObservedHiring },
      recency: { text: person.recency },
    },
  }
}

function describeCompanies(companies: CompanyHiring | undefined): DefinitionRow[] {
  if (!companies) return []
  return [
    ...companies.companies.map((company) => ({ label: company.companyName, value: peopleLabel(company.peopleCount) })),
    { label: 'Company needs review', value: peopleLabel(companies.needsReviewCount) },
    { label: 'Company not visible', value: peopleLabel(companies.notVisibleCount) },
  ]
}

function peopleLabel(count: number): string {
  return count === 1 ? '1 person' : `${formatCount(count)} people`
}
