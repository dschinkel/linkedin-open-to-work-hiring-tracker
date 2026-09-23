import type { ChartSeries } from '@/components/LineTrendChart'
import { formatShortDate } from '@/shared-formatting/formatMetric'

export const formatDateTick = (isoDate: string): string => formatShortDate(isoDate)
export const formatRateTick = (rate: number): string => `${rate.toFixed(1)}%`
export const formatCountTick = (count: number): string => String(count)

export const openRateSeries: ChartSeries[] = [
  { key: 'openRate', label: 'Daily', color: 'var(--open-to-work)', isFilled: true },
  { key: 'openRateSevenDayAverage', label: '7-day moving average', color: 'var(--muted-series)', dashed: true },
]

export const matchedRateSeries: ChartSeries[] = [
  { key: 'openRate', label: 'Raw sample rate', color: 'var(--open-to-work)' },
  { key: 'matchedOpenRate', label: 'Matched-cohort rate', color: 'var(--muted-series)', dashed: true },
]

export const openStatusChangeSeries: ChartSeries[] = [
  { key: 'addedOpen', label: 'Added open', color: 'var(--open-to-work)' },
  { key: 'removedOpen', label: 'Removed open', color: 'var(--removed)', isHatched: true },
]

export const hiringStatusChangeSeries: ChartSeries[] = [
  { key: 'addedHiring', label: 'Added hiring', color: 'var(--hiring)' },
  { key: 'removedHiring', label: 'Removed hiring', color: 'var(--removed)', isHatched: true },
]

export const netFlowSeries: ChartSeries[] = [{ key: 'netOpen', label: 'Net open flow', color: 'var(--open-to-work)', showDots: true }]

export const transitionRateSeries: ChartSeries[] = [
  { key: 'entryRate', label: 'Entry rate', color: 'var(--open-to-work)' },
  { key: 'removalRate', label: 'Removal rate', color: 'var(--removed)' },
]

export const hiringRateSeries: ChartSeries[] = [{ key: 'hiringRate', label: 'Hiring-frame rate', color: 'var(--hiring)', isFilled: true }]
