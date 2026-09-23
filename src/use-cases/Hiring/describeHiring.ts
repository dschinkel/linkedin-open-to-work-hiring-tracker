import type { HiringPerson, HiringSummary } from '@contracts/api'
import type { StatTileView } from '@/components/StatTile'
import { daysSince, formatCount, formatPercent, formatShortDate, formatSignedCount } from '@/shared-formatting/formatMetric'

const noPriorHint = 'No comparable prior observations yet.'
const recentDays = 14

export function describeHiringTiles(summary: HiringSummary): StatTileView[] {
  const flowHint = summary.hasComparablePrior ? undefined : noPriorHint
  return [
    { label: 'Hiring rate', value: formatPercent(summary.rate), hint: summary.uncertain ? `${summary.uncertain} uncertain excluded` : undefined },
    { label: 'Hiring people', value: formatCount(summary.hiring), hint: `of ${formatCount(summary.hiring + summary.notHiring)} classified` },
    { label: 'Companies', value: formatCount(summary.companyCount), hint: 'Reliably visible on cards' },
    { label: 'Newly hiring', value: formatSignedCount(summary.added), hint: flowHint },
    { label: 'Removed hiring', value: formatSignedCount(-summary.removed), hint: flowHint },
    { label: 'Net hiring', value: formatSignedCount(summary.net), hint: flowHint },
  ]
}

export interface HiringPersonRow {
  personId: string
  name: string
  /** Up to two letters standing in for the profile photo. */
  initials: string
  headline: string
  company: string
  isCompanyVisible: boolean
  companyNeedsReview: boolean
  firstSeenHiring: string
  lastSeenHiring: string
  daysObservedHiring: string
  recency: string
  isStale: boolean
}

/** Never claims the frame is present today unless the person was actually in today's screenshots. */
export function describeHiringPerson(person: HiringPerson, today: Date = new Date()): HiringPersonRow {
  return {
    personId: person.personId,
    name: person.displayName,
    initials: initialsOf(person.displayName),
    headline: person.headline ?? '',
    company: person.companyName ?? 'Company not visible',
    isCompanyVisible: person.companyName !== null,
    companyNeedsReview: person.companyNeedsReview,
    firstSeenHiring: formatShortDate(person.firstSeenHiring),
    lastSeenHiring: formatShortDate(person.lastSeenHiring),
    daysObservedHiring: String(person.daysObservedHiring),
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
