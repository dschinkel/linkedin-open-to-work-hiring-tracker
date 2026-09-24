import type { NetworkIndex } from './NetworkIndex.ts'
import type { Signal, SignalStatus } from '../../shared/domain/Observation.ts'
import { daysBetween } from '../../shared/domain/ScanDate.ts'

export interface FrameSighting {
  scanDate: string
  status: SignalStatus
}

/**
 * The latest unbroken run of scans showing a frame.
 * `days` counts calendar days from `since` to `lastSeen`, both included, so a frame first seen today is 1 day.
 * `scansSeen` counts the scans in the run that actually showed the frame.
 */
export interface FrameStreak {
  since: string
  lastSeen: string
  days: number
  scansSeen: number
  isOngoing: boolean
}

interface Run {
  since: string
  lastSeen: string
  scansSeen: number
  isOngoing: boolean
}

/**
 * Only a clear reading without the frame ends a run; a scan the person was missing from, or an unclear photo, does not.
 * A frame seen again after it ended starts a new run.
 */
export function latestFrameStreak(sightings: FrameSighting[]): FrameStreak | null {
  const run = sightings.reduce<Run | null>(recordSighting, null)
  if (run === null) return null
  return { ...run, days: daysBetween(run.since, run.lastSeen) + 1 }
}

function recordSighting(run: Run | null, sighting: FrameSighting): Run | null {
  if (sighting.status === 'NEGATIVE') return run && { ...run, isOngoing: false }
  if (sighting.status === 'UNCERTAIN') return run
  if (run === null || !run.isOngoing) return { since: sighting.scanDate, lastSeen: sighting.scanDate, scansSeen: 1, isOngoing: true }
  return { ...run, lastSeen: sighting.scanDate, scansSeen: run.scansSeen + 1 }
}

/** Each person's latest run of scans showing the given frame, for everyone ever seen with it. */
export function frameStreaksByPerson(index: NetworkIndex, signal: Signal): Map<string, FrameStreak> {
  const streaks = new Map<string, FrameStreak>()
  for (const [personId, sightings] of sightingsByPerson(index, signal)) {
    const streak = latestFrameStreak(sightings)
    if (streak) streaks.set(personId, streak)
  }
  return streaks
}

function sightingsByPerson(index: NetworkIndex, signal: Signal): Map<string, FrameSighting[]> {
  const sightings = new Map<string, FrameSighting[]>()
  for (const scan of index.scansInOrder) {
    for (const observation of index.observationsOf(scan.id)) {
      const personSightings = sightings.get(observation.personId) ?? []
      personSightings.push({ scanDate: scan.scanDate, status: signal.read(observation) })
      sightings.set(observation.personId, personSightings)
    }
  }
  return sightings
}
