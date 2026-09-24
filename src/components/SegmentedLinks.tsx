import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface SegmentLink {
  label: string
  to: string
  isActive: boolean
  detail?: string
}

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
