import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { CompanyHiring, CompanyKnownFilter, HiringPeopleQuery, HiringPerson, HiringSnapshot, HiringStatusFilter, Snapshot } from '@contracts/api'
import type { LoadStatus } from '@/components/AsyncContent'
import type { DataColumn, DataRow } from '@/components/DataTable'
import type { DefinitionRow } from '@/components/DefinitionList'
import type { PickerOption } from '@/components/OptionPicker'
import { exportTableOf, type ListExporter, localToday } from '@/shared-exports/listExport'
import { type ExportListView, useExportList } from '@/shared-exports/useExportList'
import { formatPeople } from '@/shared-formatting/formatMetric'
import { seenInCell, withSeenInColumn } from '@/shared-formatting/seenIn'
import { useTrackerEnvironment } from '@/shared-repositories/trackerEnvironment'
import { loadStatusOf } from '@/shared-state/loadStatus'
import { type SortedRows, sortRows, useSortedRows } from '@/shared-state/useSortedRows'
import type { SnapshotRepository } from '@/use-cases/Snapshots/SnapshotRepository'
import { type KeepSnapshotsView, useKeepSnapshots } from '@/use-cases/Snapshots/useKeepSnapshots'
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
  areSavedFiltersLocked: boolean
  exporting: ExportListView
  snapshots: KeepSnapshotsView
  snapshotDetail: string
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

const initialSort = { key: 'lastSeen', direction: 'desc' } as const
const hiringList = { slug: 'hiring', title: 'Hiring' }

const initialFilters: HiringPeopleQuery = { search: '', company: '', status: 'current', companyKnown: 'all', sort: 'lastSeen' }

export function useFindHiringPeople(injectedRepository?: HiringRepository, exporter?: ListExporter, snapshotRepository?: SnapshotRepository): HiringPeopleView {
  const { api, audience } = useTrackerEnvironment()
  const repository = injectedRepository ?? hiringRepositoryFor(api)
  const shownColumns = withSeenInColumn(columns, audience)
  const [filters, setFilters] = useState<HiringPeopleQuery>(initialFilters)
  const people = useQuery({ queryKey: ['hiring-people', filters], queryFn: () => repository.people(filters), placeholderData: keepPreviousData })
  const companies = useQuery({ queryKey: ['hiring-companies'], queryFn: repository.companies })
  const snapshots = useKeepSnapshots({ kind: 'hiring', list: hiringList, filters, tableOf: (snapshot) => tableOfSnapshot(snapshot, shownColumns) }, snapshotRepository, exporter)
  const viewed = hiringSnapshotIn(snapshots.viewedSnapshot)
  const rows = viewed ? rowsOfSnapshot(viewed, viewed.people.filter((person) => matchesTextFilters(person, filters))) : (people.data ?? []).map((person) => toTableRow(person))
  const table = useSortedRows(shownColumns, rows, initialSort)
  const exporting = useExportList(() => ({ ...(snapshots.viewedExportName ?? { list: hiringList, date: localToday() }), ...exportTableOf(table.columns, table.rows) }), exporter)

  function updateFilter<Key extends keyof HiringPeopleQuery>(key: Key) {
    return (value: HiringPeopleQuery[Key]) => setFilters((current) => ({ ...current, [key]: value }))
  }

  return {
    ...(snapshots.isViewingSnapshot ? snapshots.viewedStatus : loadStatusOf(people)),
    filters: viewed ? { ...viewed.filters, search: filters.search, company: filters.company } : filters,
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
    areSavedFiltersLocked: snapshots.isViewingSnapshot,
    exporting,
    snapshots,
    snapshotDetail: viewed ? describeSavedFilters(viewed.filters) : '',
  }
}

function describeSavedFilters(filters: HiringPeopleQuery): string {
  const choices = [
    statusOptions.find((option) => option.value === filters.status)?.label,
    companyKnownOptions.find((option) => option.value === filters.companyKnown)?.label,
    filters.search && `name “${filters.search}”`,
    filters.company && `company “${filters.company}”`,
  ].filter(Boolean)
  return `Saved with: ${choices.join(' · ')}. Name and company search the saved people.`
}

function hiringSnapshotIn(snapshot: Snapshot | null): HiringSnapshot | null {
  return snapshot?.kind === 'hiring' ? snapshot : null
}

function rowsOfSnapshot(snapshot: HiringSnapshot, people: HiringPerson[] = snapshot.people): DataRow[] {
  return people.map((person) => toTableRow(person, new Date(snapshot.createdAt)))
}

function tableOfSnapshot(snapshot: Snapshot, shownColumns: DataColumn[]) {
  const hiring = hiringSnapshotIn(snapshot)
  return exportTableOf(shownColumns, sortRows(hiring ? rowsOfSnapshot(hiring) : [], initialSort))
}

function matchesTextFilters(person: HiringPerson, { search, company }: HiringPeopleQuery): boolean {
  return includesText(person.displayName, search) && includesText(person.companyName, company)
}

function includesText(value: string | null, wanted: string): boolean {
  return (value ?? '').toLowerCase().includes(wanted.trim().toLowerCase())
}

function toTableRow(person: HiringPerson, today?: Date): DataRow {
  const row = describeHiringPerson(person, today)
  return {
    id: row.personId,
    isMuted: row.isStale,
    cells: {
      name: { text: row.name },
      headline: { text: row.headline },
      company: { text: row.company, note: row.companyNeedsReview ? 'review' : undefined },
      in: seenInCell(person.seenIn),
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
