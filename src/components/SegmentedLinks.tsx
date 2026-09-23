import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export interface SegmentLink {
  label: string
  to: string
  isActive: boolean
}

/** A pill-shaped toggle whose options are links, e.g. [Followers | Contacts]. */
export function SegmentedLinks({ label, links }: { label: string; links: SegmentLink[] }) {
  return (
    <nav aria-label={label} className="inline-flex rounded-lg border bg-muted p-0.5">
      {links.map((link) => (
        <Link
          key={link.label}
          to={link.to}
          aria-current={link.isActive ? 'page' : undefined}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium transition-colors',
            link.isActive ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
