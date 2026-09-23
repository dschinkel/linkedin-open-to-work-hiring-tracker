import { createElement } from 'react'
import type { ChartConfig } from '@/components/ui/chart'
import type { ChartSeries } from './LineTrendChart'

/** Turns the app's series list into a shadcn ChartConfig: label, color, and a hatched swatch for hatched bars. */
export function chartConfigFor(series: ChartSeries[]): ChartConfig {
  return Object.fromEntries(series.map((item) => [item.key, { label: item.label, color: item.color, ...(item.isHatched && { icon: hatchedSwatch(item.color) }) }]))
}

/** The legend and tooltip swatch for a hatched series, matching the bar pattern. */
function hatchedSwatch(color: string) {
  return () =>
    createElement(
      'svg',
      { viewBox: '0 0 8 8', 'aria-hidden': true, className: 'size-2.5! shrink-0' },
      createElement('rect', { width: 8, height: 8, fill: color, fillOpacity: 0.2 }),
      createElement('path', { d: 'M-2 2 L2 -2 M0 8 L8 0 M6 10 L10 6', stroke: color, strokeWidth: 1.6 }),
    )
}
