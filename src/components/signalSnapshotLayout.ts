import type { StatTileView } from './StatTile'

export type DeltaTone = 'up' | 'down' | 'flat'

export interface SnapshotLayout {
  headline: StatTileView | undefined
  keyFacts: StatTileView[]
  movement: Array<StatTileView & { tone: DeltaTone }>
}

export function snapshotLayout(tiles: StatTileView[]): SnapshotLayout {
  const [headline, ...rest] = tiles
  return {
    headline,
    keyFacts: rest.slice(0, 2),
    movement: rest.slice(2).map((tile) => ({ ...tile, tone: deltaTone(tile.value) })),
  }
}

function deltaTone(value: string): DeltaTone {
  if (value.startsWith('+')) return 'up'
  if (value.startsWith('-')) return 'down'
  return 'flat'
}
