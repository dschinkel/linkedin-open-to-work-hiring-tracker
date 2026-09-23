import type { DurationDistribution } from '../../../contracts/api.ts'
import type { NetworkIndex } from './NetworkIndex.ts'
import { openToWorkSignal, type SignalStatus } from '../../shared/domain/Observation.ts'
import { percentage } from './Rates.ts'
import { daysBetween } from '../../shared/domain/ScanDate.ts'

interface StatusSighting {
  scanDate: string
  status: SignalStatus
}

interface EpisodeTracker {
  openSince: string | null
  seenNotOpen: boolean
  durations: number[]
}

const buckets = [
  { label: '< 7 days', fits: (days: number) => days < 7 },
  { label: '7–30 days', fits: (days: number) => days >= 7 && days <= 30 },
  { label: '31–60 days', fits: (days: number) => days > 30 && days <= 60 },
  { label: '61–90 days', fits: (days: number) => days > 60 && days <= 90 },
  { label: '90+ days', fits: (days: number) => days > 90 },
]

/**
 * Observed duration: from the first scan showing NOT_OPEN → OPEN to the first scan showing OPEN → NOT_OPEN.
 * Episodes without an observed start or end are left out, because their true length is unknown.
 */
export function observedDurations(index: NetworkIndex): DurationDistribution {
  const durations = [...sightingsByPerson(index).values()].flatMap(completedEpisodeDurations)
  return {
    completedEpisodes: durations.length,
    medianDays: median(durations),
    buckets: buckets.map((bucket) => ({ label: bucket.label, share: percentage(durations.filter(bucket.fits).length, durations.length) ?? 0 })),
  }
}

function sightingsByPerson(index: NetworkIndex): Map<string, StatusSighting[]> {
  const sightings = new Map<string, StatusSighting[]>()
  for (const scan of index.scansInOrder) {
    for (const observation of index.observationsOf(scan.id)) {
      const personSightings = sightings.get(observation.personId) ?? []
      personSightings.push({ scanDate: scan.scanDate, status: openToWorkSignal.read(observation) })
      sightings.set(observation.personId, personSightings)
    }
  }
  return sightings
}

export function completedEpisodeDurations(sightings: StatusSighting[]): number[] {
  const tracker: EpisodeTracker = { openSince: null, seenNotOpen: false, durations: [] }
  for (const sighting of sightings) trackSighting(tracker, sighting)
  return tracker.durations
}

function trackSighting(tracker: EpisodeTracker, sighting: StatusSighting): void {
  if (sighting.status === 'NEGATIVE') closeEpisode(tracker, sighting.scanDate)
  if (sighting.status === 'POSITIVE') openEpisode(tracker, sighting.scanDate)
}

function closeEpisode(tracker: EpisodeTracker, scanDate: string): void {
  if (tracker.openSince !== null) tracker.durations.push(daysBetween(tracker.openSince, scanDate))
  tracker.openSince = null
  tracker.seenNotOpen = true
}

function openEpisode(tracker: EpisodeTracker, scanDate: string): void {
  if (tracker.openSince === null && tracker.seenNotOpen) tracker.openSince = scanDate
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}
