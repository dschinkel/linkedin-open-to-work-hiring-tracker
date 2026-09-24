import { useMemo } from 'react'
import { Bar, BarChart, Brush, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip } from '@/components/ui/chart'
import { chartConfigFor } from './chartConfig'
import { barAxisFormat, barColorAt, barCountFormat, mirrorBelowZero } from './chartData'
import { chartAxisTick, chartBrush, chartMargin, chartTickGap } from './chartStyles'
import { FormattedChartTooltip } from './FormattedChartTooltip'
import type { ChartSeries } from './LineTrendChart'

interface BarComparisonChartProps {
  data: object[]
  xKey: string
  series: ChartSeries[]
  formatX: (value: string) => string
  zoomGroup?: string
}

export function BarComparisonChart({ data, xKey, series, formatX, zoomGroup }: BarComparisonChartProps) {
  const config = useMemo(() => chartConfigFor(series, 'bar'), [series])
  const isMirrored = series.some((bar) => bar.isBelowZero)
  const hasNegatives = isMirrored || series.some((bar) => bar.negativeColor)
  const plotted = useMemo(() => mirrorBelowZero(data, series), [data, series])
  const formatCount = barCountFormat(isMirrored)

  return (
    <ChartContainer config={config} className="aspect-auto h-75 w-full">
      <BarChart data={plotted} syncId={zoomGroup} stackOffset={isMirrored ? 'sign' : undefined} barCategoryGap="22%" margin={chartMargin}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey={xKey} tickFormatter={formatX} tick={chartAxisTick} minTickGap={chartTickGap} axisLine={false} tickLine={false} tickMargin={8} />
        <YAxis allowDecimals={false} tickFormatter={barAxisFormat(isMirrored)} tick={chartAxisTick} width={48} axisLine={false} tickLine={false} tickCount={5} />
        <ChartTooltip cursor={{ fill: 'var(--muted)', fillOpacity: 0.6 }} content={<FormattedChartTooltip config={config} formatValue={formatCount} formatLabel={formatX} />} />
        <ChartLegend verticalAlign="top" align="left" content={<ChartLegendContent className="justify-start pb-2" />} />
        <Brush dataKey={xKey} {...chartBrush} tickFormatter={formatX} />
        {hasNegatives && <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.6} />}
        {series.map((bar) => (
          <Bar key={bar.key} dataKey={bar.key} stackId={isMirrored ? 'flow' : undefined} fill={`var(--color-${bar.key})`} isAnimationActive={false}>
            {bar.negativeColor && plotted.map((point, index) => <Cell key={index} fill={barColorAt(point, bar)} />)}
          </Bar>
        ))}
      </BarChart>
    </ChartContainer>
  )
}
