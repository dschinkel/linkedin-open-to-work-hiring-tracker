import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface SegmentLink {
  label: string
  to: string
  isActive: boolean
  /** Optional figure shown after the label, e.g. a count. */
  detail?: string
}

/** A segmented switch whose options are links, e.g. [Followers 742 | Connections 468]; the chosen one is filled with the theme's prompt color. */
export function SegmentedLinks({ label, links }: { label: string; links: SegmentLink[] }) {
  return (
    <nav aria-label={label} className="inline-flex border">
      {links.map((link) => (
        <Link
          key={link.label}
          to={link.to}
          aria-current={link.isActive ? 'page' : undefined}
          className={cn(
            buttonVariants({ variant: 'ghost' }),
            link.isActive ? 'bg-prompt-fill font-bold text-prompt-foreground hover:bg-prompt-fill hover:text-prompt-foreground' : 'font-normal text-muted-foreground',
          )}
        >
          {link.label}
          {link.detail && <span className="tabular-nums opacity-75"> {link.detail}</span>}
        </Link>
      ))}
    </nav>
  )
}
