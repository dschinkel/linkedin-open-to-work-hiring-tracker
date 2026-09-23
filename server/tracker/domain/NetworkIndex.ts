import type { Network, Observation, Person, Scan } from '../../shared/domain/Observation.ts'

/** Read-side lookups over a network, built once. */
export interface NetworkIndex {
  scansInOrder: Scan[]
  observationsOf: (scanId: string) => Observation[]
  personOf: (personId: string) => Person
}

export function indexNetwork(network: Network): NetworkIndex {
  const observationsByScan = groupObservationsByScan(network.observations)
  const peopleById = new Map(network.people.map((person) => [person.id, person]))
  return {
    scansInOrder: [...network.scans].sort((a, b) => a.scanDate.localeCompare(b.scanDate)),
    observationsOf: (scanId) => observationsByScan.get(scanId) ?? [],
    personOf: (personId) => peopleById.get(personId) as Person,
  }
}

function groupObservationsByScan(observations: Observation[]): Map<string, Observation[]> {
  const groups = new Map<string, Observation[]>()
  for (const observation of observations) {
    const group = groups.get(observation.scanId) ?? []
    group.push(observation)
    groups.set(observation.scanId, group)
  }
  return groups
}
