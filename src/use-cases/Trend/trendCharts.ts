import type { ChartSeries } from '@/components/LineTrendChart'
import { formatShortDate } from '@/shared-formatting/formatMetric'

export const formatDateTick = (isoDate: string): string => formatShortDate(isoDate)
export const formatRateTick = (rate: number): string => `${rate.toFixed(1)}%`

export const openRateSeries: ChartSeries[] = [
  { key: 'openRate', label: 'Daily', color: 'var(--open-to-work)', role: 'context' },
  { key: 'openRateSevenDayAverage', label: '7-day moving average', color: 'var(--open-to-work)', role: 'trend' },
]

export const matchedRateSeries: ChartSeries[] = [
  { key: 'openRate', label: 'Raw sample rate', color: 'var(--open-to-work)', role: 'context' },
  { key: 'matchedOpenRate', label: 'Matched-cohort rate', color: 'var(--open-to-work)', role: 'trend' },
]

export const openStatusChangeSeries: ChartSeries[] = [
  { key: 'addedOpen', label: 'Added open', color: 'var(--open-to-work)' },
  { key: 'removedOpen', label: 'Removed open', color: 'var(--removed)', isBelowZero: true },
]

export const hiringStatusChangeSeries: ChartSeries[] = [
  { key: 'addedHiring', label: 'Added hiring', color: 'var(--hiring)' },
  { key: 'removedHiring', label: 'Removed hiring', color: 'var(--removed)', isBelowZero: true },
]

export const netFlowSeries: ChartSeries[] = [{ key: 'netOpen', label: 'Net open flow', color: 'var(--open-to-work)', negativeColor: 'var(--removed)' }]

export const transitionRateSeries: ChartSeries[] = [
  { key: 'entryRate', label: 'Entry rate', color: 'var(--open-to-work)', role: 'trend' },
  { key: 'removalRate', label: 'Removal rate', color: 'var(--removed)', role: 'trend' },
]

export const hiringRateSeries: ChartSeries[] = [{ key: 'hiringRate', label: 'Hiring-frame rate', color: 'var(--hiring)', role: 'trend' }]
