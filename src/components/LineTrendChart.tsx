import { useMemo } from 'react'
import { Brush, CartesianGrid, Line, LineChart, ReferenceDot, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip } from '@/components/ui/chart'
import { chartConfigFor } from './chartConfig'
import { inDrawOrder, isTrendLine, latestTrendPoints, niceScale, plottedValues } from './chartData'
import { chartAxisTick, chartBrush, chartTickGap, endLabelFont, lineChartMargin } from './chartStyles'
import { FormattedChartTooltip } from './FormattedChartTooltip'

export interface ChartSeries {
  key: string
  label: string
  color: string
  /** Lines: a `trend` is drawn bold and labelled with its latest value; `context` is drawn thin and faint behind it. */
  role?: 'trend' | 'context'
  /** Bars: drawn below the zero line, so exits hang under entries on the same day. */
  isBelowZero?: boolean
  /** Bars: color for values under zero, for a signed series such as net flow. */
  negativeColor?: string
}

interface LineTrendChartProps {
  data: object[]
  xKey: string
  series: ChartSeries[]
  formatX: (value: string) => string
  /** Charts sharing a zoomGroup zoom and show tooltips together. */
  zoomGroup?: string
  formatY: (value: number) => string
}

const trendActiveDot = { r: 3.5, strokeWidth: 2, stroke: 'var(--card)' }

/**
 * Straight segments between scans. Context lines sit faint underneath; trend lines are bold and end in a dot labelled
 * with the latest value in the right margin. The vertical scale fits the data with round steps rather than starting at
 * zero, so movement is visible.
 */
export function LineTrendChart({ data, xKey, series, formatX, zoomGroup, formatY }: LineTrendChartProps) {
  const config = useMemo(() => chartConfigFor(series, 'line'), [series])
  const ordered = useMemo(() => inDrawOrder(series), [series])
  const scale = useMemo(() => niceScale(plottedValues(data, series)), [data, series])
  const endpoints = useMemo(() => latestTrendPoints(data, xKey, series), [data, xKey, series])

  return (
    <ChartContainer config={config} className="aspect-auto h-75 w-full">
      <LineChart data={data} syncId={zoomGroup} margin={lineChartMargin}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey={xKey} tickFormatter={formatX} tick={chartAxisTick} minTickGap={chartTickGap} axisLine={false} tickLine={false} tickMargin={8} />
        <YAxis domain={scale?.domain ?? ['auto', 'auto']} ticks={scale?.ticks} tickFormatter={formatY} tick={chartAxisTick} width={56} axisLine={false} tickLine={false} />
        <ChartTooltip cursor={{ stroke: 'var(--muted-foreground)', strokeOpacity: 0.5 }} content={<FormattedChartTooltip config={config} formatValue={formatY} formatLabel={formatX} />} />
        <ChartLegend verticalAlign="top" align="left" content={<ChartLegendContent className="justify-start pb-2" />} />
        <Brush dataKey={xKey} {...chartBrush} tickFormatter={formatX} />
        {ordered.map((line) => (
          <Line
            key={line.key}
            type="linear"
            dataKey={line.key}
            stroke={`var(--color-${line.key})`}
            strokeWidth={isTrendLine(line) ? 2 : 1.25}
            strokeOpacity={isTrendLine(line) ? 1 : 0.4}
            dot={false}
            activeDot={isTrendLine(line) ? trendActiveDot : false}
            connectNulls
            isAnimationActive={false}
          />
        ))}
        {endpoints.map((point) => (
          <ReferenceDot
            key={point.key}
            x={point.x}
            y={point.y}
            r={3.5}
            fill={`var(--color-${point.key})`}
            stroke="var(--card)"
            strokeWidth={2}
            label={{ value: formatY(point.y), position: 'right', offset: 8, ...endLabelFont, fill: `var(--color-${point.key})` }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}
