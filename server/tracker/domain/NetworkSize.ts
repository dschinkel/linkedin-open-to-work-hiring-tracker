import type { NetworkSize } from '../../../contracts/api.ts'
import { scansMissedThreshold } from './DepartedPeople.ts'
import type { NetworkIndex } from './NetworkIndex.ts'

export function networkSize(index: NetworkIndex): NetworkSize {
  return { peopleCount: recentPeopleIds(index).size, latestScanDate: index.scansInOrder.at(-1)?.scanDate ?? null }
}

export function recentPeopleIds(index: NetworkIndex): Set<string> {
  const recentScans = index.scansInOrder.slice(-scansMissedThreshold)
  return new Set(recentScans.flatMap((scan) => index.observationsOf(scan.id).map((observation) => observation.personId)))
}
