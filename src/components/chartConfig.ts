import { createElement } from 'react'
import type { ChartConfig } from '@/components/ui/chart'
import type { ChartSeries } from './LineTrendChart'

/**
 * Turns the app's series list into a shadcn ChartConfig. Each series gets a legend/tooltip key drawn like its mark:
 * a short line (bold for a trend, faint for context) or a bar block (split green/red for a signed series).
 */
export function chartConfigFor(series: ChartSeries[], mark: 'line' | 'bar'): ChartConfig {
  return Object.fromEntries(
    series.map((item) => [
      item.key,
      { label: item.label, color: item.color, icon: mark === 'line' ? lineKey(item.color, item.role ?? 'trend') : barKey(item.color, item.negativeColor) },
    ]),
  )
}

function lineKey(color: string, role: 'trend' | 'context') {
  const isTrend = role === 'trend'
  return () =>
    createElement(
      'svg',
      { viewBox: '0 0 14 8', 'aria-hidden': true, className: 'h-2 w-3.5! shrink-0' },
      createElement('line', { x1: 0, y1: 4, x2: 14, y2: 4, stroke: color, strokeWidth: isTrend ? 2.5 : 1.5, strokeOpacity: isTrend ? 1 : 0.45 }),
    )
}

function barKey(color: string, negativeColor?: string) {
  return () =>
    createElement(
      'svg',
      { viewBox: '0 0 8 8', 'aria-hidden': true, className: 'size-2.5! shrink-0' },
      createElement('rect', { width: 8, height: negativeColor ? 4 : 8, fill: color }),
      negativeColor ? createElement('rect', { y: 4, width: 8, height: 4, fill: negativeColor }) : null,
    )
}
