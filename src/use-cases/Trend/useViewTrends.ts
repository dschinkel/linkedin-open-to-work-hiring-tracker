import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { DurationDistribution, MovingAverage, TimeWindow, TrendPoint, Trends } from '@contracts/api'
import type { LoadStatus } from '@/components/AsyncContent'
import type { DataColumn, DataRow } from '@/components/DataTable'
import type { PickerOption } from '@/components/OptionPicker'
import type { StatTileView } from '@/components/StatTile'
import { formatCount, formatPercent, formatPercentagePoints, formatRatio } from '@/shared-formatting/formatMetric'
import { timeWindowOptions } from '@/shared-formatting/timeWindowOptions'
import { useTrackerEnvironment } from '@/shared-repositories/trackerEnvironment'
import { loadStatusOf } from '@/shared-state/loadStatus'
import type { DurationBucketRow } from './DurationDistribution'
import { type TrendRepository, trendRepositoryFor } from './TrendRepository'

export interface TrendsView {
  status: LoadStatus
  errorMessage: string
  points: TrendPoint[]
  hasTrend: boolean
  showTrendPending: boolean
  timeWindow: TimeWindow
  windowOptions: PickerOption<TimeWindow>[]
  chooseTimeWindow: (timeWindow: TimeWindow) => void
  movingAverageColumns: DataColumn[]
  movingAverageRows: DataRow[]
  flowTiles: StatTileView[]
  hasDurations: boolean
  showDurationPending: boolean
  durationTiles: StatTileView[]
  durationBuckets: DurationBucketRow[]
}

const pointsNeededForTrend = 2

const movingAverageColumns: DataColumn[] = [
  { key: 'metric', label: 'Metric' },
  { key: 'rate', label: 'Rate', isNumeric: true },
  { key: 'change', label: 'Change', isNumeric: true },
]

export function useViewTrends(injectedRepository?: TrendRepository): TrendsView {
  const { api } = useTrackerEnvironment()
  const repository = injectedRepository ?? trendRepositoryFor(api)
  const [timeWindow, chooseTimeWindow] = useState<TimeWindow>('90d')
  const query = useQuery({ queryKey: ['trends', timeWindow], queryFn: () => repository.trends(timeWindow) })
  const points = query.data?.points ?? []

  return {
    ...loadStatusOf(query),
    points,
    hasTrend: points.length >= pointsNeededForTrend,
    showTrendPending: points.length < pointsNeededForTrend,
    timeWindow,
    windowOptions: timeWindowOptions,
    chooseTimeWindow,
    movingAverageColumns,
    movingAverageRows: (query.data?.movingAverages ?? []).map(toMovingAverageRow),
    flowTiles: describeFlowTotals(query.data),
    hasDurations: (query.data?.durations.completedEpisodes ?? 0) > 0,
    showDurationPending: (query.data?.durations.completedEpisodes ?? 0) === 0,
    durationTiles: describeDurations(query.data?.durations),
    durationBuckets: (query.data?.durations.buckets ?? []).map(toDurationBucketRow),
  }
}

function toMovingAverageRow(average: MovingAverage): DataRow {
  return {
    id: average.label,
    cells: {
      metric: { text: average.label },
      rate: { text: formatPercent(average.rate) },
      change: { text: formatPercentagePoints(average.changePp) },
    },
  }
}

function describeFlowTotals(trends: Trends | undefined): StatTileView[] {
  if (!trends) return []
  const { addedOpen, removedOpen, entryExitRatio } = trends.flowTotals
  return [
    { label: 'Added Open to Work', value: formatCount(addedOpen) },
    { label: 'Removed Open to Work', value: formatCount(removedOpen) },
    { label: 'Entry / exit ratio', value: formatRatio(entryExitRatio), hint: 'Observed entries per observed exit' },
  ]
}

function describeDurations(durations: DurationDistribution | undefined): StatTileView[] {
  if (!durations) return []
  return [
    { label: 'Median observed duration', value: durations.medianDays === null ? '—' : `${durations.medianDays} days` },
    { label: 'Completed episodes', value: formatCount(durations.completedEpisodes), hint: 'Observed start and observed removal' },
  ]
}

function toDurationBucketRow(bucket: DurationDistribution['buckets'][number]): DurationBucketRow {
  return { label: bucket.label, share: bucket.share, shareLabel: `${Math.round(bucket.share)}%` }
}
