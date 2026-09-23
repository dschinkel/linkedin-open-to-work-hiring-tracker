import { SectionCard } from '@/components/SectionCard'
import { StatGrid } from '@/components/StatGrid'
import type { StatTileView } from '@/components/StatTile'

export function OpenToWorkSnapshot({ tiles }: { tiles: StatTileView[] }) {
  return (
    <SectionCard title="Open to Work" description="Public #OPEN_TO_WORK frame rate in sampled network. Not an unemployment rate.">
      <StatGrid tiles={tiles} />
    </SectionCard>
  )
}
