import { Brush, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ChartSeries } from './LineTrendChart'

interface BarComparisonChartProps {
  data: object[]
  xKey: string
  series: ChartSeries[]
  formatX: (value: string) => string
  /** Charts sharing a zoomGroup zoom and show tooltips together. */
  zoomGroup?: string
}

export function BarComparisonChart({ data, xKey, series, formatX, zoomGroup }: BarComparisonChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} syncId={zoomGroup} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey={xKey} tickFormatter={formatX} tick={{ fontSize: 12 }} minTickGap={24} stroke="var(--muted-foreground)" />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={40} stroke="var(--muted-foreground)" />
        <Tooltip
          labelFormatter={(label) => formatX(String(label))}
          contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8 }}
          cursor={{ fill: 'var(--muted)' }}
        />
        <Legend verticalAlign="top" height={28} />
        <Brush dataKey={xKey} height={26} travellerWidth={10} tickFormatter={formatX} stroke="var(--muted-foreground)" fill="var(--card)" />
        {series.map((bar) => (
          <Bar key={bar.key} dataKey={bar.key} name={bar.label} fill={bar.color} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
