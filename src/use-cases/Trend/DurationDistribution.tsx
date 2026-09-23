import { Progress } from '@/components/ui/progress'

export interface DurationBucketRow {
  label: string
  share: number
  shareLabel: string
}

export function DurationDistribution({ buckets }: { buckets: DurationBucketRow[] }) {
  return (
    <ul className="space-y-2 text-label">
      {buckets.map((bucket) => (
        <li key={bucket.label} className="grid grid-cols-[6rem_1fr_3rem] items-center gap-3">
          <span className="text-muted-foreground">{bucket.label}</span>
          <Progress value={bucket.share} className="[&_[data-slot=progress-indicator]]:bg-open-to-work" />
          <span className="text-right tabular-nums">{bucket.shareLabel}</span>
        </li>
      ))}
    </ul>
  )
}
