import type { StatTileView } from '@/components/StatTile'

export function linkTile(tiles: StatTileView[], label: string, href: string): StatTileView[] {
  return tiles.map((tile) => (tile.label === label ? { ...tile, href } : tile))
}
