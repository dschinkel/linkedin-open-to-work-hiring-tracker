import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ScanSummary, TimeWindow } from '@contracts/api'
import type { LoadStatus } from '@/components/AsyncContent'
import type { DataColumn, DataRow, SortDirection } from '@/components/DataTable'
import type { PickerOption } from '@/components/OptionPicker'
import {
  formatCount,
  formatLongDate,
  formatPercent,
  formatPercentagePoints,
  formatSignedCount,
} from '@/shared-formatting/formatMetric'
import { timeWindowOptions } from '@/shared-formatting/timeWindowOptions'
import { loadStatusOf } from '@/shared-state/loadStatus'
import { type ScanRepository, scanRepository } from './ScanRepository'

export type ColumnSet = 'openToWork' | 'hiring' | 'all'

export interface ScanHistoryView {
  status: LoadStatus
  errorMessage: string
  hasScans: boolean
  showNoScans: boolean
  timeWindow: TimeWindow
  windowOptions: PickerOption<TimeWindow>[]
  chooseTimeWindow: (window: TimeWindow) => void
  columnSet: ColumnSet
  columnSetOptions: PickerOption<ColumnSet>[]
  chooseColumnSet: (columnSet: ColumnSet) => void
  columns: DataColumn[]
  rows: DataRow[]
  sortKey: string
  sortDirection: SortDirection
  sortBy: (key: string) => void
  openScan: (scanId: string) => void
}

interface HistoryColumn extends DataColumn {
  cell: (scan: ScanSummary) => string
  sortValue?: (scan: ScanSummary) => number | string
}

const columnSetOptions: PickerOption<ColumnSet>[] = [
  { value: 'openToWork', label: 'Open to Work' },
  { value: 'hiring', label: 'Hiring' },
  { value: 'all', label: 'All metrics' },
]

const dateColumn: HistoryColumn = { key: 'date', label: 'Date', isSortable: true, cell: (scan) => formatLongDate(scan.scanDate), sortValue: (scan) => scan.scanDate }
const sampledColumn: HistoryColumn = { key: 'sampled', label: 'Sampled', isNumeric: true, isSortable: true, cell: (scan) => formatCount(scan.peopleCount), sortValue: (scan) => scan.peopleCount }

const openColumns: HistoryColumn[] = [
  { key: 'open', label: 'Open', isNumeric: true, isSortable: true, cell: (scan) => formatCount(scan.openToWork.open), sortValue: (scan) => scan.openToWork.open },
  { key: 'openRate', label: 'Open %', isNumeric: true, isSortable: true, cell: (scan) => formatPercent(scan.openToWork.rate), sortValue: (scan) => scan.openToWork.rate ?? -1 },
  { key: 'matchedRate', label: 'Matched %', isNumeric: true, cell: (scan) => formatPercent(scan.openToWork.matchedRate) },
  { key: 'sevenDay', label: '7-day Δ', isNumeric: true, cell: (scan) => formatPercentagePoints(scan.openToWork.sevenDayChangePp) },
  { key: 'newOpen', label: 'New open', isNumeric: true, cell: (scan) => formatSignedCount(scan.openToWork.added) },
  { key: 'removedOpen', label: 'Removed', isNumeric: true, cell: (scan) => formatSignedCount(-scan.openToWork.removed) },
  { key: 'openNet', label: 'Net', isNumeric: true, cell: (scan) => formatSignedCount(scan.openToWork.net) },
  { key: 'entryRate', label: 'Entry rate', isNumeric: true, cell: (scan) => formatPercent(scan.openToWork.entryRate) },
  { key: 'removalRate', label: 'Removal rate', isNumeric: true, cell: (scan) => formatPercent(scan.openToWork.removalRate) },
]

const hiringColumns: HistoryColumn[] = [
  { key: 'hiring', label: 'Hiring', isNumeric: true, isSortable: true, cell: (scan) => formatCount(scan.hiring.hiring), sortValue: (scan) => scan.hiring.hiring },
  { key: 'hiringRate', label: 'Hiring %', isNumeric: true, isSortable: true, cell: (scan) => formatPercent(scan.hiring.rate), sortValue: (scan) => scan.hiring.rate ?? -1 },
  { key: 'newHiring', label: 'New hiring', isNumeric: true, cell: (scan) => formatSignedCount(scan.hiring.added) },
  { key: 'removedHiring', label: 'Removed', isNumeric: true, cell: (scan) => formatSignedCount(-scan.hiring.removed) },
  { key: 'hiringNet', label: 'Net', isNumeric: true, cell: (scan) => formatSignedCount(scan.hiring.net) },
  { key: 'companies', label: 'Companies', isNumeric: true, cell: (scan) => formatCount(scan.hiring.companyCount) },
]

const columnsBySet: Record<ColumnSet, HistoryColumn[]> = {
  openToWork: [dateColumn, sampledColumn, ...openColumns],
  hiring: [dateColumn, sampledColumn, ...hiringColumns],
  all: [dateColumn, sampledColumn, ...openColumns.slice(0, 2), ...openColumns.slice(4, 7), ...hiringColumns.slice(0, 5)],
}

/** Daily History: one row per scan, newest first by default, sortable and clickable. */
export function useViewScanHistory(repository: ScanRepository = scanRepository): ScanHistoryView {
  const navigate = useNavigate()
  const [timeWindow, chooseTimeWindow] = useState<TimeWindow>('30d')
  const [columnSet, chooseColumnSet] = useState<ColumnSet>('openToWork')
  const [sort, setSort] = useState<{ key: string; direction: SortDirection }>({ key: 'date', direction: 'desc' })
  const query = useQuery({ queryKey: ['scans', timeWindow], queryFn: () => repository.history(timeWindow) })
  const columns = columnsBySet[columnSet]

  function sortBy(key: string): void {
    setSort((current) => ({ key, direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc' }))
  }

  return {
    ...loadStatusOf(query),
    hasScans: (query.data?.length ?? 0) > 0,
    showNoScans: (query.data?.length ?? 0) === 0,
    timeWindow,
    windowOptions: timeWindowOptions,
    chooseTimeWindow,
    columnSet,
    columnSetOptions,
    chooseColumnSet,
    columns,
    rows: toRows(sortScans(query.data ?? [], columns, sort), columns),
    sortKey: sort.key,
    sortDirection: sort.direction,
    sortBy,
    openScan: (scanId) => navigate(`/scans/${scanId}`),
  }
}

function sortScans(scans: ScanSummary[], columns: HistoryColumn[], sort: { key: string; direction: SortDirection }): ScanSummary[] {
  const sortValue = columns.find((column) => column.key === sort.key)?.sortValue ?? dateColumn.sortValue!
  const ascending = [...scans].sort((a, b) => compareValues(sortValue(a), sortValue(b)))
  return sort.direction === 'asc' ? ascending : ascending.reverse()
}

function compareValues(a: number | string, b: number | string): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b))
}

function toRows(scans: ScanSummary[], columns: HistoryColumn[]): DataRow[] {
  return scans.map((scan) => ({
    id: scan.id,
    cells: Object.fromEntries(columns.map((column) => [column.key, { text: column.cell(scan) }])),
  }))
}
