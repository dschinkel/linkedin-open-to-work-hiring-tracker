import type { ScanPeople } from '../../../contracts/api.ts'
import type { Observation, Person, Scan } from '../../shared/domain/Observation.ts'

interface SavedScan {
  scan: Scan
  people: Person[]
  observations: Observation[]
}

export function listScanPeople({ scan, people, observations }: SavedScan): ScanPeople {
  const peopleById = new Map(people.map((person) => [person.id, person]))
  return {
    scanId: scan.id,
    scanDate: scan.scanDate,
    people: observations
      .flatMap((observation) => {
        const person = peopleById.get(observation.personId)
        if (!person) return []
        return [{
          personId: person.id,
          displayName: person.displayName,
          headline: person.headline,
          companyName: person.companyName,
          openToWork: observation.openToWork.status,
          hiring: observation.hiring.status,
        }]
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName) || a.personId.localeCompare(b.personId)),
  }
}
