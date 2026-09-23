import type { NetworkSize } from '../../contracts/api.ts'
import { scansMissedThreshold } from './departedPeople.ts'
import type { NetworkIndex } from './networkIndex.ts'

/**
 * How many people are in your list now: everyone seen in the last few scans, counted once.
 * Several partial scans add up (someone missed today but seen yesterday still counts), and anyone
 * who would appear on the unfollowers / past-contacts list is left out.
 */
export function networkSize(index: NetworkIndex): NetworkSize {
  const recentScans = index.scansInOrder.slice(-scansMissedThreshold)
  const people = new Set(recentScans.flatMap((scan) => index.observationsOf(scan.id).map((observation) => observation.personId)))
  return { peopleCount: people.size, latestScanDate: index.scansInOrder.at(-1)?.scanDate ?? null }
}
