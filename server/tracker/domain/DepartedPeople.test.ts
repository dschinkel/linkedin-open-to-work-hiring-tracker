import { listDepartedPeople } from './DepartedPeople.ts'
import { indexNetwork } from './NetworkIndex.ts'
import type { Network, Observation, Person, Scan } from '../../shared/domain/Observation.ts'

function person(id: string): Person {
  return { id, personHash: id, displayName: id, headline: null, companyName: null, companyConfidence: null, companyExtractionMethod: 'unknown' }
}

function scan(scanDate: string): Scan {
  return { id: scanDate, scanDate, screenshots: [], cardsDetected: 0, duplicateCount: 0 }
}

function seen(personId: string, scanDate: string): Observation {
  return {
    scanId: scanDate,
    personId,
    openToWork: { status: 'OPEN', confidence: 0.97, classificationMethod: 'opencv' },
    hiring: { status: 'NOT_HIRING', confidence: 0.97, classificationMethod: 'opencv' },
  }
}

const dates = ['2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22']

function networkWhere(sightings: Record<string, string[]>): Network {
  return {
    people: Object.keys(sightings).map(person),
    scans: dates.map(scan),
    observations: Object.entries(sightings).flatMap(([personId, scanDates]) => scanDates.map((scanDate) => seen(personId, scanDate))),
  }
}

describe('people no longer in your list', () => {
  it('lists someone missing from the last three scans', () => {
    const network = networkWhere({ gone: dates.slice(0, 2), stayed: dates })

    expect(listDepartedPeople(indexNetwork(network)).people.map((departed) => departed.personId)).toEqual(['gone'])
  })

  it('does not list someone who only missed a scan or two', () => {
    const network = networkWhere({ skippedTwo: dates.slice(0, 3) })

    expect(listDepartedPeople(indexNetwork(network)).people).toEqual([])
  })

  it('remembers whether they were Open to Work when last seen', () => {
    const network = networkWhere({ gone: dates.slice(0, 1) })

    expect(listDepartedPeople(indexNetwork(network)).people[0]).toMatchObject({ lastSeen: '2026-09-18', scansMissed: 4, wasOpenToWorkWhenLastSeen: true })
  })
})
