import { Brush, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface ChartSeries {
  key: string
  label: string
  color: string
  dashed?: boolean
  showDots?: boolean
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

export function LineTrendChart({ data, xKey, series, formatX, zoomGroup, formatY, showZeroLine = false }: LineTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} syncId={zoomGroup} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey={xKey} tickFormatter={formatX} tick={{ fontSize: 12 }} minTickGap={24} stroke="var(--muted-foreground)" />
        <YAxis tickFormatter={formatY} tick={{ fontSize: 12 }} width={56} stroke="var(--muted-foreground)" />
        <Tooltip
          formatter={(value) => formatY(Number(value))}
          labelFormatter={(label) => formatX(String(label))}
          contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8 }}
        />
        <Legend verticalAlign="top" height={28} />
        <Brush dataKey={xKey} height={26} travellerWidth={10} tickFormatter={formatX} stroke="var(--muted-foreground)" fill="var(--card)" />
        {showZeroLine && <ReferenceLine y={0} stroke="var(--muted-foreground)" />}
        {series.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.label}
            stroke={line.color}
            strokeWidth={2}
            strokeDasharray={line.dashed ? '5 4' : undefined}
            dot={line.showDots ?? false}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
