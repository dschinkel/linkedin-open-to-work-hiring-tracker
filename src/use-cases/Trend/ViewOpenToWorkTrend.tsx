import { AsyncContent } from '@/components/AsyncContent'
import { BarComparisonChart } from '@/components/BarComparisonChart'
import { EmptyState } from '@/components/EmptyState'
import { LineTrendChart } from '@/components/LineTrendChart'
import { OptionPicker } from '@/components/OptionPicker'
import { SectionCard } from '@/components/SectionCard'
import { formatDateTick, formatRateTick, openRateSeries, openStatusChangeSeries } from './trendCharts'
import { useViewOpenToWorkTrend } from './useViewOpenToWorkTrend'

export function ViewOpenToWorkTrend() {
  const trend = useViewOpenToWorkTrend()

  return (
    <AsyncContent status={trend.status} errorMessage={trend.errorMessage}>
      {trend.showTrendPending && <EmptyState title="Trend data available after additional scans." />}
      {trend.hasTrend && (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard
            title="Open-to-Work rate"
            description="Public Open-to-Work rate in sampled network"
            action={<OptionPicker label="Time window" value={trend.timeWindow} options={trend.windowOptions} onChange={trend.chooseTimeWindow} />}
          >
            <LineTrendChart data={trend.points} xKey="scanDate" zoomGroup="dashboard-trend" series={openRateSeries} formatX={formatDateTick} formatY={formatRateTick} />
          </SectionCard>
          <SectionCard title="Entry vs removal" description="People changing Open-to-Work status: why the rate moved. Drag the handles below a chart to zoom.">
            <BarComparisonChart data={trend.points} xKey="scanDate" zoomGroup="dashboard-trend" series={openStatusChangeSeries} formatX={formatDateTick} />
          </SectionCard>
        </div>
      )}
    </AsyncContent>
  )
}
