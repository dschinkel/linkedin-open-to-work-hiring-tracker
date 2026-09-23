import { useQuery } from '@tanstack/react-query'
import type { TimeWindow, TitleTrends } from '@contracts/api'
import type { LoadStatus } from '@/components/AsyncContent'
import type { DataColumn, DataRow } from '@/components/DataTable'
import { formatCount, formatPercent, formatPercentagePoints } from '@/shared-formatting/formatMetric'
import { useTrackerEnvironment } from '@/shared-repositories/trackerEnvironment'
import { loadStatusOf } from '@/shared-state/loadStatus'
import { type TrendRepository, trendRepositoryFor } from './TrendRepository'

export interface OpenToWorkByTitleView {
  status: LoadStatus
  errorMessage: string
  coverageNote: string
  hasTitles: boolean
  showNoTitles: boolean
  columns: DataColumn[]
  rows: DataRow[]
}

/** Open-to-Work rate per job title family over time, with how many people that covers. */
export function useViewOpenToWorkByTitle(timeWindow: TimeWindow, injectedRepository?: TrendRepository): OpenToWorkByTitleView {
  const { api } = useTrackerEnvironment()
  const repository = injectedRepository ?? trendRepositoryFor(api)
  const query = useQuery({ queryKey: ['title-trends', timeWindow], queryFn: () => repository.titleTrends(timeWindow) })
  const trends = query.data

  return {
    ...loadStatusOf(query),
    coverageNote: describeCoverage(trends),
    hasTitles: (trends?.rows.length ?? 0) > 0,
    showNoTitles: (trends?.rows.length ?? 0) === 0,
    columns: columnsFor(trends?.periods ?? []),
    rows: (trends?.rows ?? []).map(toRow),
  }
}

function describeCoverage(trends: TitleTrends | undefined): string {
  if (!trends) return ''
  return `Based on the ${formatCount(trends.peopleWithTitle)} of ${formatCount(trends.peopleTotal)} people whose job title could be read. People without a readable title aren't included, so this doesn't represent everyone.`
}

function columnsFor(periods: string[]): DataColumn[] {
  return [
    { key: 'title', label: 'Job title' },
    ...periods.map((period, position) => ({ key: `period-${position}`, label: period, isNumeric: true })),
    { key: 'change', label: 'Change', isNumeric: true },
  ]
}

function toRow(row: TitleTrends['rows'][number]): DataRow {
  const periodCells = Object.fromEntries(row.cells.map((cell, position) => [`period-${position}`, { text: describeCell(cell) }]))
  return { id: row.title, cells: { title: { text: row.title }, ...periodCells, change: { text: formatPercentagePoints(row.changePp) } } }
}

function describeCell(cell: TitleTrends['rows'][number]['cells'][number]): string {
  if (cell.classified === 0) return '—'
  return `${formatPercent(cell.rate)} · ${cell.open}/${cell.classified}`
}
