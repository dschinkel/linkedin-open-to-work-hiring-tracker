import type { ComponentProps } from 'react'
import { type ChartConfig, ChartTooltipContent } from '@/components/ui/chart'

type FormattedChartTooltipProps = ComponentProps<typeof ChartTooltipContent> & {
  config: ChartConfig
  formatValue: (value: number) => string
  formatLabel: (value: string) => string
}

/** shadcn's chart tooltip with this app's value and date formatting; Recharts fills in active, payload and label. */
export function FormattedChartTooltip({ config, formatValue, formatLabel, ...props }: FormattedChartTooltipProps) {
  return (
    <ChartTooltipContent
      {...props}
      className="min-w-40"
      labelFormatter={(label) => formatLabel(String(label))}
      formatter={(value, name) => <TooltipRow config={config} seriesKey={String(name)} value={formatValue(Number(value))} />}
    />
  )
}

function TooltipRow({ config, seriesKey, value }: { config: ChartConfig; seriesKey: string; value: string }) {
  const Icon = config[seriesKey]?.icon
  return (
    <>
      {Icon ? <Icon /> : <span aria-hidden className="size-2.5 shrink-0" style={{ background: `var(--color-${seriesKey})` }} />}
      <span className="flex flex-1 justify-between gap-4 leading-none">
        <span className="text-muted-foreground">{config[seriesKey]?.label ?? seriesKey}</span>
        <span className="font-medium text-foreground tabular-nums">{value}</span>
      </span>
    </>
  )
}
