import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export interface SegmentLink {
  label: string
  to: string
  isActive: boolean
  /** Optional figure shown after the label, e.g. a count. */
  detail?: string
}

/** A pill-shaped toggle whose options are links, e.g. [Followers 742 | Contacts 468]. */
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
            link.isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
          )}
        >
          {link.label}
          {link.detail && <span className="ml-1 tabular-nums opacity-70"> {link.detail}</span>}
        </Link>
      ))}
    </nav>
  )
}
