import type { TrendPoint } from '@contracts/api'
import { BarComparisonChart } from '@/components/BarComparisonChart'
import { LineTrendChart } from '@/components/LineTrendChart'
import { SectionCard } from '@/components/SectionCard'
import { formatDateTick, formatRateTick, hiringRateSeries, hiringStatusChangeSeries } from './trendCharts'

export function HiringTrendCharts({ points }: { points: TrendPoint[] }) {
  return (
    <>
      <SectionCard title="Hiring-frame rate" description="Visible #HIRING frames in the sampled network, not job openings">
        <LineTrendChart data={points} xKey="scanDate" zoomGroup="trends" series={hiringRateSeries} formatX={formatDateTick} formatY={formatRateTick} />
      </SectionCard>
      <SectionCard title="Hiring-frame changes" description="Newly hiring vs removed hiring frames">
        <BarComparisonChart data={points} xKey="scanDate" zoomGroup="trends" series={hiringStatusChangeSeries} formatX={formatDateTick} />
      </SectionCard>
    </>
  )
}
