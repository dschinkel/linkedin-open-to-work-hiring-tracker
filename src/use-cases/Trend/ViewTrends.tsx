import { AsyncContent } from '@/components/AsyncContent'
import { BarComparisonChart } from '@/components/BarComparisonChart'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { LineTrendChart } from '@/components/LineTrendChart'
import { OptionPicker } from '@/components/OptionPicker'
import { SectionCard } from '@/components/SectionCard'
import { StatGrid } from '@/components/StatGrid'
import { HiringTrendCharts } from './HiringTrendCharts'
import { ObservedDuration } from './ObservedDuration'
import {
  formatCountTick,
  formatDateTick,
  formatRateTick,
  matchedRateSeries,
  netFlowSeries,
  openRateSeries,
  openStatusChangeSeries,
  transitionRateSeries,
} from './trendCharts'
import { useViewTrends } from './useViewTrends'

export function ViewTrends() {
  const trends = useViewTrends()

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Trends</h2>
          <p className="text-sm text-muted-foreground">Stock, flow, and whether the movement is trustworthy. Drag the handles under any chart to zoom; all charts follow.</p>
        </div>
        <OptionPicker label="Time window" value={trends.timeWindow} options={trends.windowOptions} onChange={trends.chooseTimeWindow} />
      </div>
      <AsyncContent status={trends.status} errorMessage={trends.errorMessage}>
        {trends.showTrendPending && <EmptyState title="Trend data available after additional scans." />}
        {trends.hasTrend && (
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Open-to-Work rate" description="Daily rate with a 7-day moving average across actual scans">
              <LineTrendChart data={trends.points} xKey="scanDate" zoomGroup="trends" series={openRateSeries} formatX={formatDateTick} formatY={formatRateTick} />
            </SectionCard>
            <SectionCard title="Moving averages" description="Averages over scans actually taken; missing days are skipped, not filled">
              <DataTable columns={trends.movingAverageColumns} rows={trends.movingAverageRows} />
            </SectionCard>
            <SectionCard title="Raw vs matched cohort" description="Matched = only people classified in both this scan and the one before">
              <LineTrendChart data={trends.points} xKey="scanDate" zoomGroup="trends" series={matchedRateSeries} formatX={formatDateTick} formatY={formatRateTick} />
            </SectionCard>
            <SectionCard title="Entry vs removal" description="People whose public frame appeared or disappeared">
              <BarComparisonChart data={trends.points} xKey="scanDate" zoomGroup="trends" series={openStatusChangeSeries} formatX={formatDateTick} />
            </SectionCard>
            <SectionCard title="Net Open-to-Work flow" description="Positive: more entries than exits. Negative: more exits than entries.">
              <LineTrendChart data={trends.points} xKey="scanDate" zoomGroup="trends" series={netFlowSeries} formatX={formatDateTick} formatY={formatCountTick} showZeroLine />
            </SectionCard>
            <SectionCard
              title="Entry and removal rates"
              description="Entry: not open → open ÷ previously not open seen again. Removal: open → not open ÷ previously open seen again."
            >
              <LineTrendChart data={trends.points} xKey="scanDate" zoomGroup="trends" series={transitionRateSeries} formatX={formatDateTick} formatY={formatRateTick} />
            </SectionCard>
            <SectionCard title="Flow totals in window" description="Removal means the frame is no longer observed, not that someone found a job">
              <StatGrid tiles={trends.flowTiles} />
            </SectionCard>
            <ObservedDuration
              tiles={trends.durationTiles}
              buckets={trends.durationBuckets}
              hasDurations={trends.hasDurations}
              showDurationPending={trends.showDurationPending}
            />
            <HiringTrendCharts points={trends.points} />
          </div>
        )}
      </AsyncContent>
    </>
  )
}
