import { SectionCard } from '@/components/SectionCard'
import { StatGrid } from '@/components/StatGrid'
import type { StatTileView } from '@/components/StatTile'

export function HiringSnapshot({ tiles }: { tiles: StatTileView[] }) {
  return (
    <SectionCard title="Hiring" description="Public #HIRING frame rate in sampled network. Counts people, not open roles.">
      <StatGrid tiles={tiles} />
    </SectionCard>
  )
}
