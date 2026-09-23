import { useMemo } from 'react'
import { Area, Brush, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip } from '@/components/ui/chart'
import { chartConfigFor } from './chartConfig'
import { chartAxisTick, chartGridDash } from './chartStyles'
import { FormattedChartTooltip } from './FormattedChartTooltip'

export interface ChartSeries {
  key: string
  label: string
  color: string
  dashed?: boolean
  showDots?: boolean
  /** Shade the space under the line in the series color. */
  isFilled?: boolean
  /** Bars only: fill with diagonal hatching instead of a solid color, e.g. removals. */
  isHatched?: boolean
}

interface LineTrendChartProps {
  data: object[]
  xKey: string
  series: ChartSeries[]
  formatX: (value: string) => string
  /** Charts sharing a zoomGroup zoom and show tooltips together. */
  zoomGroup?: string
  formatY: (value: number) => string
  showZeroLine?: boolean
}

const activeDot = { r: 3, strokeWidth: 0, fill: 'var(--prompt-fill)' }

/** Stepped lines like a plotter, with hatched fill under filled series. */
export function LineTrendChart({ data, xKey, series, formatX, zoomGroup, formatY, showZeroLine = false }: LineTrendChartProps) {
  const config = useMemo(() => chartConfigFor(series), [series])

  return (
    <ChartContainer config={config} className="aspect-auto h-75 w-full">
      <ComposedChart data={data} syncId={zoomGroup} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <defs>
          {series
            .filter((line) => line.isFilled)
            .map((line) => (
              <pattern key={line.key} id={`fill-${line.key}`} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1={0} y1={0} x2={0} y2={6} stroke={`var(--color-${line.key})`} strokeWidth={1} strokeOpacity={0.35} />
              </pattern>
            ))}
        </defs>
        <CartesianGrid strokeDasharray={chartGridDash} />
        <XAxis dataKey={xKey} tickFormatter={formatX} tick={chartAxisTick} minTickGap={28} tickLine={false} />
        <YAxis tickFormatter={formatY} tick={chartAxisTick} width={56} axisLine={false} tickLine={false} />
        <ChartTooltip cursor={{ stroke: 'var(--prompt-fill)', strokeDasharray: '2 3' }} content={<FormattedChartTooltip config={config} formatValue={formatY} formatLabel={formatX} />} />
        <ChartLegend verticalAlign="top" align="left" content={<ChartLegendContent className="justify-start" />} />
        <Brush dataKey={xKey} height={22} travellerWidth={8} tickFormatter={formatX} stroke="var(--border)" fill="var(--muted)" />
        {showZeroLine && <ReferenceLine y={0} stroke="var(--muted-foreground)" />}
        {series.map((line) =>
          line.isFilled ? (
            <Area
              key={line.key}
              type="stepAfter"
              dataKey={line.key}
              stroke={`var(--color-${line.key})`}
              strokeWidth={1.5}
              fill={`url(#fill-${line.key})`}
              dot={line.showDots ?? false}
              activeDot={activeDot}
              connectNulls
              isAnimationActive={false}
            />
          ) : (
            <Line
              key={line.key}
              type={line.dashed ? 'linear' : 'stepAfter'}
              dataKey={line.key}
              stroke={`var(--color-${line.key})`}
              strokeWidth={1.5}
              strokeDasharray={line.dashed ? '2 3' : undefined}
              dot={line.showDots ?? false}
              activeDot={activeDot}
              connectNulls
              isAnimationActive={false}
            />
          ),
        )}
      </ComposedChart>
    </ChartContainer>
  )
}
