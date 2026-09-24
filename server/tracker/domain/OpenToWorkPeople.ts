import type { OpenToWorkPerson } from '../../../contracts/api.ts'
import { openToWorkSignal } from '../../shared/domain/Observation.ts'
import type { NetworkIndex } from './NetworkIndex.ts'
import { type FrameStreak, frameStreaksByPerson } from './FrameStreaks.ts'

/**
 * Everyone whose most recent clear reading shows the #OPENTOWORK frame, most recently seen first,
 * with how long their current run of open scans has lasted.
 * Someone who has since been read without the frame is left out.
 */
export function listOpenToWorkPeople(index: NetworkIndex): OpenToWorkPerson[] {
  const latestScanDate = index.scansInOrder.at(-1)?.scanDate
  const firstSeenOpen = firstSeenOpenByPerson(index)
  return [...frameStreaksByPerson(index, openToWorkSignal).entries()]
    .filter(([, streak]) => streak.isOngoing)
    .map(([personId, streak]) => ({
      ...personDetails(index, personId),
      firstSeenOpen: firstSeenOpen.get(personId) as string,
      ...streakDetails(streak, latestScanDate),
    }))
    .sort((a, b) => b.lastSeenOpen.localeCompare(a.lastSeenOpen) || a.displayName.localeCompare(b.displayName))
}

function firstSeenOpenByPerson(index: NetworkIndex): Map<string, string> {
  const firstSeen = new Map<string, string>()
  for (const scan of index.scansInOrder) {
    for (const observation of index.observationsOf(scan.id)) {
      if (openToWorkSignal.read(observation) === 'POSITIVE' && !firstSeen.has(observation.personId)) firstSeen.set(observation.personId, scan.scanDate)
    }
  }
  return firstSeen
}

function personDetails(index: NetworkIndex, personId: string): Pick<OpenToWorkPerson, 'personId' | 'displayName' | 'headline' | 'companyName'> {
  const person = index.personOf(personId)
  return { personId, displayName: person.displayName, headline: person.headline, companyName: person.companyName }
}

function streakDetails(streak: FrameStreak, latestScanDate: string | undefined): Omit<OpenToWorkPerson, 'personId' | 'displayName' | 'headline' | 'companyName' | 'firstSeenOpen'> {
  return {
    lastSeenOpen: streak.lastSeen,
    openSince: streak.since,
    daysOpen: streak.days,
    scansSeenOpen: streak.scansSeen,
    wasObservedInLatestScan: streak.lastSeen === latestScanDate,
  }
}
