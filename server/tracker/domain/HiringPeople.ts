import type { CompanyHiring, HiringPeopleQuery, HiringPerson, HiringSort } from '../../../contracts/api.ts'
import { isReliableCompany, normalizeCompanyName } from '../../shared/domain/Company.ts'
import type { NetworkIndex } from './NetworkIndex.ts'
import { hiringSignal, type Person, type SignalStatus } from '../../shared/domain/Observation.ts'
import { type FrameStreak, frameStreaksByPerson } from './FrameStreaks.ts'

type HiringStreakDetails = Pick<HiringPerson, 'hiringSince' | 'daysHiring' | 'scansSeenHiring'>

interface HiringHistory {
  firstSeenHiring: string | null
  lastSeenHiring: string | null
  lastSeen: string
  latestClassifiedStatus: SignalStatus
}

/** Everyone ever observed with the #HIRING frame, with how recently it was actually seen and how long their latest run lasted. */
export function listHiringPeople(index: NetworkIndex): HiringPerson[] {
  const latestScanDate = index.scansInOrder.at(-1)?.scanDate
  const streaks = frameStreaksByPerson(index, hiringSignal)
  return [...hiringHistories(index).entries()]
    .filter(([, history]) => history.firstSeenHiring !== null)
    .map(([personId, history]) => ({
      ...toHiringPerson(index.personOf(personId), history, latestScanDate),
      ...streakDetails(streaks.get(personId) as FrameStreak),
    }))
}

function hiringHistories(index: NetworkIndex): Map<string, HiringHistory> {
  const histories = new Map<string, HiringHistory>()
  for (const scan of index.scansInOrder) {
    for (const observation of index.observationsOf(scan.id)) {
      const history = histories.get(observation.personId) ?? emptyHistory(scan.scanDate)
      histories.set(observation.personId, recordSighting(history, scan.scanDate, hiringSignal.read(observation)))
    }
  }
  return histories
}

function emptyHistory(scanDate: string): HiringHistory {
  return { firstSeenHiring: null, lastSeenHiring: null, lastSeen: scanDate, latestClassifiedStatus: 'UNCERTAIN' }
}

function recordSighting(history: HiringHistory, scanDate: string, status: SignalStatus): HiringHistory {
  const isHiring = status === 'POSITIVE'
  return {
    firstSeenHiring: history.firstSeenHiring ?? (isHiring ? scanDate : null),
    lastSeenHiring: isHiring ? scanDate : history.lastSeenHiring,
    lastSeen: scanDate,
    latestClassifiedStatus: status === 'UNCERTAIN' ? history.latestClassifiedStatus : status,
  }
}

function toHiringPerson(person: Person, history: HiringHistory, latestScanDate: string | undefined): Omit<HiringPerson, keyof HiringStreakDetails> {
  const lastSeenHiring = history.lastSeenHiring as string
  return {
    personId: person.id,
    displayName: person.displayName,
    headline: person.headline,
    companyName: person.companyName,
    companyNeedsReview: person.companyName !== null && !isReliableCompany(person),
    firstSeenHiring: history.firstSeenHiring as string,
    lastSeenHiring,
    lastSeen: history.lastSeen,
    isCurrentlyHiring: history.latestClassifiedStatus === 'POSITIVE',
    wasObservedInLatestScan: lastSeenHiring === latestScanDate,
  }
}

function streakDetails(streak: FrameStreak): HiringStreakDetails {
  return { hiringSince: streak.since, daysHiring: streak.days, scansSeenHiring: streak.scansSeen }
}

export function filterHiringPeople(people: HiringPerson[], query: HiringPeopleQuery): HiringPerson[] {
  return people
    .filter((person) => matchesStatus(person, query.status))
    .filter((person) => matchesCompanyKnown(person, query.companyKnown))
    .filter((person) => includesText(person.displayName, query.search))
    .filter((person) => includesText(person.companyName, query.company))
    .sort(comparators[query.sort])
}

function matchesStatus(person: HiringPerson, status: HiringPeopleQuery['status']): boolean {
  if (status === 'current') return person.isCurrentlyHiring
  if (status === 'previous') return !person.isCurrentlyHiring
  return true
}

function matchesCompanyKnown(person: HiringPerson, companyKnown: HiringPeopleQuery['companyKnown']): boolean {
  if (companyKnown === 'known') return person.companyName !== null
  if (companyKnown === 'unknown') return person.companyName === null
  return true
}

function includesText(value: string | null, search: string): boolean {
  if (search.trim() === '') return true
  return (value ?? '').toLowerCase().includes(search.trim().toLowerCase())
}

const comparators: Record<HiringSort, (a: HiringPerson, b: HiringPerson) => number> = {
  lastSeen: (a, b) => b.lastSeenHiring.localeCompare(a.lastSeenHiring) || a.displayName.localeCompare(b.displayName),
  firstSeen: (a, b) => b.hiringSince.localeCompare(a.hiringSince) || a.displayName.localeCompare(b.displayName),
  duration: (a, b) => b.daysHiring - a.daysHiring || a.displayName.localeCompare(b.displayName),
  name: (a, b) => a.displayName.localeCompare(b.displayName),
}

/** Counts currently-Hiring people per reliably visible company. A count is people, not open roles. */
export function aggregateHiringCompanies(people: HiringPerson[]): CompanyHiring {
  const current = people.filter((person) => person.isCurrentlyHiring)
  return {
    companies: countByCompany(current.filter((person) => person.companyName !== null && !person.companyNeedsReview)),
    notVisibleCount: current.filter((person) => person.companyName === null).length,
    needsReviewCount: current.filter((person) => person.companyNeedsReview).length,
  }
}

function countByCompany(people: HiringPerson[]): CompanyHiring['companies'] {
  const counts = new Map<string, { companyName: string; peopleCount: number }>()
  for (const person of people) {
    const key = normalizeCompanyName(person.companyName as string)
    const entry = counts.get(key) ?? { companyName: person.companyName as string, peopleCount: 0 }
    counts.set(key, { ...entry, peopleCount: entry.peopleCount + 1 })
  }
  return [...counts.values()].sort((a, b) => b.peopleCount - a.peopleCount || a.companyName.localeCompare(b.companyName))
}
