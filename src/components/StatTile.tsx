import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'

export interface StatTileView {
  label: string
  value: string
  hint?: string
  href?: string
}

export function StatTile({ label, value, hint, href }: StatTileView) {
  const body = (
    <Card size="sm" className="h-full">
      <CardContent>
        <div className="flex items-start justify-between gap-2">
          <div className="figure text-figure text-primary">{value}</div>
          {href && <ChevronRight className="size-4 text-prompt" />}
        </div>
        <div className="mt-2 text-label">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  )
  if (!href) return body
  return (
    <Link to={href} className="block transition-colors hover:[&_[data-slot=card]]:border-prompt hover:[&_[data-slot=card]]:bg-accent">
      {body}
    </Link>
  )
}
