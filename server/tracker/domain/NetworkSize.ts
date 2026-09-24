import type { NetworkSize } from '../../../contracts/api.ts'
import { scansMissedThreshold } from './DepartedPeople.ts'
import type { NetworkIndex } from './NetworkIndex.ts'

export function networkSize(index: NetworkIndex): NetworkSize {
  const recentScans = index.scansInOrder.slice(-scansMissedThreshold)
  const people = new Set(recentScans.flatMap((scan) => index.observationsOf(scan.id).map((observation) => observation.personId)))
  return { peopleCount: people.size, latestScanDate: index.scansInOrder.at(-1)?.scanDate ?? null }
}
