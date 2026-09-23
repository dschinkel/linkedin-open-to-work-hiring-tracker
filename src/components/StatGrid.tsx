import { StatTile, type StatTileView } from './StatTile'

export function StatGrid({ tiles }: { tiles: StatTileView[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {tiles.map((tile) => (
        <StatTile key={tile.label} {...tile} />
      ))}
    </div>
  )
}
