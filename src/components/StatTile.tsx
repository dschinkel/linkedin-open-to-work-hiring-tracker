import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface StatTileView {
  label: string
  value: string
  hint?: string
  /** When set, the tile links to the list behind the number. */
  href?: string
}

export function StatTile({ label, value, hint, href }: StatTileView) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {href && <ChevronRight className="size-4 text-muted-foreground" />}
      </div>
      <div className="mt-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </>
  )
  if (!href) return <div className="rounded-lg border bg-card p-4">{body}</div>
  return (
    <Link to={href} className="block rounded-lg border bg-card p-4 transition-colors hover:border-primary hover:bg-muted/40">
      {body}
    </Link>
  )
}
