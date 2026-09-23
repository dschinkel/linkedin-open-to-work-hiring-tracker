import type { StatTileView } from './StatTile'

export type DeltaTone = 'up' | 'down' | 'flat'

export interface SnapshotLayout {
  /** The headline rate, drawn as the ring. */
  headline: StatTileView | undefined
  /** The two facts beside the ring. */
  keyFacts: StatTileView[]
  /** How it moved since the last scan, each figure toned like a diff. */
  movement: Array<StatTileView & { tone: DeltaTone }>
}

/** First tile is the headline rate, the next two its key facts, the rest how it moved since the last scan. */
export function snapshotLayout(tiles: StatTileView[]): SnapshotLayout {
  const [headline, ...rest] = tiles
  return {
    headline,
    keyFacts: rest.slice(0, 2),
    movement: rest.slice(2).map((tile) => ({ ...tile, tone: deltaTone(tile.value) })),
  }
}

/** Like a diff: a leading + reads as up, a leading - as down, anything else as flat. */
function deltaTone(value: string): DeltaTone {
  if (value.startsWith('+')) return 'up'
  if (value.startsWith('-')) return 'down'
  return 'flat'
}
