import type { HiringPerson, HiringSummary } from '@contracts/api'
import type { StatTileView } from '@/components/StatTile'
import { daysSince, formatCount, formatPercent, formatShortDate, formatSignedCount, formatTimeShowingFrame } from '@/shared-formatting/formatMetric'

const noPriorHint = 'Scan again another day'
const recentDays = 14

export function describeHiringTiles(summary: HiringSummary): StatTileView[] {
  const flowHint = summary.hasComparablePrior ? undefined : noPriorHint
  const flow = (count: number) => (summary.hasComparablePrior ? formatSignedCount(count) : '—')
  return [
    { label: 'Hiring rate', value: formatPercent(summary.rate), hint: summary.uncertain ? `${summary.uncertain} unclear photos not counted` : undefined },
    { label: 'Hiring people', value: formatCount(summary.hiring), hint: `of ${formatCount(summary.hiring + summary.notHiring)} read` },
    { label: 'Companies', value: formatCount(summary.companyCount), hint: 'Clearly visible on cards' },
    { label: 'Newly hiring', value: flow(summary.added), hint: flowHint },
    { label: 'Removed hiring', value: flow(-summary.removed) },
    { label: 'Net hiring', value: flow(summary.net) },
  ]
}

export interface HiringPersonRow {
  personId: string
  name: string
  initials: string
  headline: string
  company: string
  isCompanyVisible: boolean
  companyNeedsReview: boolean
  hiringSince: string
  lastSeenHiring: string
  timeHiring: string
  recency: string
  isStale: boolean
}

export function describeHiringPerson(person: HiringPerson, today: Date = new Date()): HiringPersonRow {
  return {
    personId: person.personId,
    name: person.displayName,
    initials: initialsOf(person.displayName),
    headline: person.headline ?? '',
    company: person.companyName ?? 'Company not visible',
    isCompanyVisible: person.companyName !== null,
    companyNeedsReview: person.companyNeedsReview,
    hiringSince: formatShortDate(person.hiringSince),
    lastSeenHiring: formatShortDate(person.lastSeenHiring),
    timeHiring: formatTimeShowingFrame(person.daysHiring, person.scansSeenHiring),
    recency: describeRecency(person, today),
    isStale: !person.wasObservedInLatestScan,
  }
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function describeRecency(person: HiringPerson, today: Date): string {
  if (!person.isCurrentlyHiring) return `Frame removed · last observed Hiring ${formatShortDate(person.lastSeenHiring)}`
  const days = daysSince(person.lastSeenHiring, today)
  if (days <= 0) return 'Observed Hiring today'
  if (days === 1) return 'Observed Hiring yesterday'
  if (days <= recentDays) return `Observed Hiring ${days} days ago`
  return `Not observed recently · last observed Hiring ${formatShortDate(person.lastSeenHiring)}`
}
