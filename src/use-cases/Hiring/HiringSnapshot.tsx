import { SignalSnapshot } from '@/components/SignalSnapshot'
import type { StatTileView } from '@/components/StatTile'

export function HiringSnapshot({ tiles }: { tiles: StatTileView[] }) {
  return <SignalSnapshot signal="hiring" title="Hiring" description="Public #HIRING frame rate in sampled network. Counts people, not open roles." frameText="#HIRING" tiles={tiles} />
}
