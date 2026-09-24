import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { SectionCard } from '@/components/SectionCard'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { HiringPersonRow } from './describeHiring'

interface WhoIsHiringPreviewProps {
  people: HiringPersonRow[]
  showNoHiringPeople: boolean
  hiringHref: string
}

export function WhoIsHiringPreview({ people, showNoHiringPeople, hiringHref }: WhoIsHiringPreviewProps) {
  return (
    <SectionCard title="Who's hiring">
      <Link to={hiringHref} className={cn(buttonVariants({ variant: 'outline' }), 'mb-3')}>
        View all hiring
      </Link>
      {showNoHiringPeople && <EmptyState title="No one is currently observed with the #HIRING frame." />}
      <ul className="divide-y divide-dashed">
        {people.map((person) => (
          <li key={person.personId} className="flex items-center gap-3 py-2.5">
            <HiringAvatar initials={person.initials} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-primary">{person.name}</div>
              {person.headline && <div className="truncate text-xs text-muted-foreground">{person.headline}</div>}
            </div>
            <span className={cn('flex shrink-0 items-center gap-2 text-right text-sm', person.isCompanyVisible ? 'font-bold text-primary' : 'text-muted-foreground italic')}>
              {person.company}
              {person.companyNeedsReview && <Badge variant="outline">review</Badge>}
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}

/** Initials in a square purple frame, standing in for the purple #HIRING frame LinkedIn draws around the photo. */
function HiringAvatar({ initials }: { initials: string }) {
  return (
    <Avatar aria-hidden className="after:border-hiring after:mix-blend-normal dark:after:mix-blend-normal">
      <AvatarFallback className="bg-hiring-soft text-xs font-bold text-hiring">{initials}</AvatarFallback>
    </Avatar>
  )
}
