import type { DepartedPeople, DepartedPerson } from '../../contracts/api.ts'
import type { NetworkIndex } from './networkIndex.ts'
import { hiringSignal, type Observation, openToWorkSignal } from './observation.ts'

/** Missing from this many scans in a row before someone counts as no longer in your list. */
export const scansMissedThreshold = 3

interface Sightings {
  firstSeen: string
  lastSeen: string
  lastObservation: Observation
  lastSeenScanIndex: number
}

/**
 * People seen before but absent from the most recent scans: likely unfollowers or removed contacts.
 * A screenshot cannot prove someone left, so this relies on each scan covering the whole list.
 */
export function listDepartedPeople(index: NetworkIndex): DepartedPeople {
  const scanCount = index.scansInOrder.length
  const people = [...sightingsByPerson(index).entries()]
    .filter(([, sightings]) => scansMissedSince(sightings, scanCount) >= scansMissedThreshold)
    .map(([personId, sightings]) => toDepartedPerson(personId, sightings, scanCount, index))
    .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen) || a.displayName.localeCompare(b.displayName))
  return { people, scansMissedThreshold }
}

function sightingsByPerson(index: NetworkIndex): Map<string, Sightings> {
  const sightings = new Map<string, Sightings>()
  index.scansInOrder.forEach((scan, scanIndex) => {
    for (const observation of index.observationsOf(scan.id)) {
      const firstSeen = sightings.get(observation.personId)?.firstSeen ?? scan.scanDate
      sightings.set(observation.personId, { firstSeen, lastSeen: scan.scanDate, lastObservation: observation, lastSeenScanIndex: scanIndex })
    }
  })
  return sightings
}

function scansMissedSince(sightings: Sightings, scanCount: number): number {
  return scanCount - 1 - sightings.lastSeenScanIndex
}

function toDepartedPerson(personId: string, sightings: Sightings, scanCount: number, index: NetworkIndex): DepartedPerson {
  const person = index.personOf(personId)
  return {
    personId,
    displayName: person.displayName,
    headline: person.headline,
    companyName: person.companyName,
    firstSeen: sightings.firstSeen,
    lastSeen: sightings.lastSeen,
    scansMissed: scansMissedSince(sightings, scanCount),
    wasOpenToWorkWhenLastSeen: openToWorkSignal.read(sightings.lastObservation) === 'POSITIVE',
    wasHiringWhenLastSeen: hiringSignal.read(sightings.lastObservation) === 'POSITIVE',
  }
}
