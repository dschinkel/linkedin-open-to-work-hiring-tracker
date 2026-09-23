import { useMemo } from 'react'
import { Bar, BarChart, Brush, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip } from '@/components/ui/chart'
import { chartConfigFor } from './chartConfig'
import { chartAxisTick, chartGridDash } from './chartStyles'
import { FormattedChartTooltip } from './FormattedChartTooltip'
import type { ChartSeries } from './LineTrendChart'

interface BarComparisonChartProps {
  data: object[]
  xKey: string
  series: ChartSeries[]
  formatX: (value: string) => string
  /** Charts sharing a zoomGroup zoom and show tooltips together. */
  zoomGroup?: string
}

const formatCount = (value: number): string => String(value)

/** Thin square bars side by side; hatched series (removals) read as struck through. */
export function BarComparisonChart({ data, xKey, series, formatX, zoomGroup }: BarComparisonChartProps) {
  const config = useMemo(() => chartConfigFor(series), [series])

  return (
    <ChartContainer config={config} className="aspect-auto h-75 w-full">
      <BarChart data={data} syncId={zoomGroup} barCategoryGap="8%" barGap={0} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <defs>
          {series
            .filter((bar) => bar.isHatched)
            .map((bar) => (
              <pattern key={bar.key} id={`hatch-${bar.key}`} width={4} height={4} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width={4} height={4} fill={`var(--color-${bar.key})`} fillOpacity={0.15} />
                <line x1={0} y1={0} x2={0} y2={4} stroke={`var(--color-${bar.key})`} strokeWidth={2} />
              </pattern>
            ))}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray={chartGridDash} />
        <XAxis dataKey={xKey} tickFormatter={formatX} tick={chartAxisTick} minTickGap={28} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={chartAxisTick} width={40} axisLine={false} tickLine={false} />
        <ChartTooltip cursor={{ fill: 'var(--accent)' }} content={<FormattedChartTooltip config={config} formatValue={formatCount} formatLabel={formatX} />} />
        <ChartLegend verticalAlign="top" align="left" content={<ChartLegendContent className="justify-start" />} />
        <Brush dataKey={xKey} height={22} travellerWidth={8} tickFormatter={formatX} stroke="var(--border)" fill="var(--muted)" />
        {series.map((bar) => (
          <Bar key={bar.key} dataKey={bar.key} fill={bar.isHatched ? `url(#hatch-${bar.key})` : `var(--color-${bar.key})`} isAnimationActive={false} />
        ))}
      </BarChart>
    </ChartContainer>
  )
}
