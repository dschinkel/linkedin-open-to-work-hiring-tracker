import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { TimeWindow, TrendPoint } from '@contracts/api'
import type { LoadStatus } from '@/components/AsyncContent'
import type { PickerOption } from '@/components/OptionPicker'
import { timeWindowOptions } from '@/shared-formatting/timeWindowOptions'
import { useTrackerEnvironment } from '@/shared-repositories/trackerEnvironment'
import { loadStatusOf } from '@/shared-state/loadStatus'
import { type TrendRepository, trendRepositoryFor } from './TrendRepository'

export interface OpenToWorkTrendView {
  status: LoadStatus
  errorMessage: string
  points: TrendPoint[]
  hasTrend: boolean
  showTrendPending: boolean
  timeWindow: TimeWindow
  windowOptions: PickerOption<TimeWindow>[]
  chooseTimeWindow: (timeWindow: TimeWindow) => void
}

const pointsNeededForTrend = 2

/** Dashboard trend: stock (rate) and the flows (added vs removed) that explain it. */
export function useViewOpenToWorkTrend(injectedRepository?: TrendRepository): OpenToWorkTrendView {
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
  }
}
