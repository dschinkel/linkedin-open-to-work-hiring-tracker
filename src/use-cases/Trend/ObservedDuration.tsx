import { EmptyState } from '@/components/EmptyState'
import { SectionCard } from '@/components/SectionCard'
import { StatGrid } from '@/components/StatGrid'
import type { StatTileView } from '@/components/StatTile'
import { DurationDistribution, type DurationBucketRow } from './DurationDistribution'

interface ObservedDurationProps {
  tiles: StatTileView[]
  buckets: DurationBucketRow[]
  hasDurations: boolean
  showDurationPending: boolean
}

export function ObservedDuration({ tiles, buckets, hasDurations, showDurationPending }: ObservedDurationProps) {
  return (
    <SectionCard title="Observed Open-to-Work duration" description="Exact enable/disable times are unknown between scans">
      {showDurationPending && <EmptyState title="More history is required for duration analysis." />}
      {hasDurations && (
        <div className="space-y-4">
          <StatGrid tiles={tiles} />
          <DurationDistribution buckets={buckets} />
        </div>
      )}
    </SectionCard>
  )
}
