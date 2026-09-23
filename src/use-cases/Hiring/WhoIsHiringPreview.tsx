import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { SectionCard } from '@/components/SectionCard'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import type { HiringPersonRow } from './describeHiring'

interface WhoIsHiringPreviewProps {
  headline: string
  people: HiringPersonRow[]
  showNoHiringPeople: boolean
  hiringHref: string
}

export function WhoIsHiringPreview({ headline, people, showNoHiringPeople, hiringHref }: WhoIsHiringPreviewProps) {
  return (
    <SectionCard
      title="Who's hiring"
      description={headline}
      action={
        <Link to={hiringHref} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          View all hiring
        </Link>
      }
    >
      {showNoHiringPeople && <EmptyState title="No one is currently observed with the #HIRING frame." />}
      <ul className="divide-y">
        {people.map((person) => (
          <li key={person.personId} className="grid gap-0.5 py-2 sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:gap-4">
            <span className="font-medium">{person.name}</span>
            <span className="truncate text-sm text-muted-foreground">{person.headline}</span>
            <span className="flex items-center gap-2 text-sm">
              {person.company}
              {person.companyNeedsReview && <Badge variant="outline">review</Badge>}
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
