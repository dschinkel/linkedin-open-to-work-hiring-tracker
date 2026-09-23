import { SignalSnapshot } from '@/components/SignalSnapshot'
import type { StatTileView } from '@/components/StatTile'

export function OpenToWorkSnapshot({ tiles }: { tiles: StatTileView[] }) {
  return (
    <SignalSnapshot
      signal="open-to-work"
      title="Open to Work"
      description="Public #OPEN_TO_WORK frame rate in sampled network. Not an unemployment rate."
      frameText="#OPENTOWORK"
      tiles={tiles}
    />
  )
}
