export interface StatTileView {
  label: string
  value: string
  hint?: string
}

export function StatTile({ label, value, hint }: StatTileView) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}
