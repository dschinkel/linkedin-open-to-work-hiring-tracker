import type { HiringPerson } from '../../../contracts/api.ts'
import type { Network, Observation, HiringStatus, Person } from '../../shared/domain/Observation.ts'
import { aggregateHiringCompanies, listHiringPeople } from './HiringPeople.ts'
import { indexNetwork } from './NetworkIndex.ts'

function hiringPerson(overrides: Partial<HiringPerson>): HiringPerson {
  return {
    personId: 'p',
    displayName: 'Jane Smith',
    headline: 'Engineering Manager',
    companyName: 'Acme Corp',
    companyNeedsReview: false,
    firstSeenHiring: '2026-09-18',
    lastSeenHiring: '2026-09-22',
    lastSeen: '2026-09-22',
    hiringSince: '2026-09-18',
    daysHiring: 5,
    scansSeenHiring: 2,
    isCurrentlyHiring: true,
    wasObservedInLatestScan: true,
    ...overrides,
  }
}

describe('companies represented by hiring frames', () => {
  it('counts hiring people per company, merging name variants', () => {
    const people = [hiringPerson({ personId: 'a' }), hiringPerson({ personId: 'b', companyName: 'ACME Corp.' })]

    expect(aggregateHiringCompanies(people).companies).toEqual([{ companyName: 'Acme Corp', peopleCount: 2 }])
  })

  it('counts people whose company is not visible separately', () => {
    expect(aggregateHiringCompanies([hiringPerson({ companyName: null })]).notVisibleCount).toBe(1)
  })

  it('leaves out people whose hiring frame was removed', () => {
    expect(aggregateHiringCompanies([hiringPerson({ isCurrentlyHiring: false })]).companies).toEqual([])
  })
})

function person(id: string): Person {
  return { id, personHash: id, displayName: id, headline: 'Manager', companyName: null, companyConfidence: null, companyExtractionMethod: 'unknown' }
}

function seen(personId: string, scanDate: string, status: HiringStatus): Observation {
  return { scanId: scanDate, personId, openToWork: { status: 'NOT_OPEN', confidence: 0.95, classificationMethod: 'pixels' }, hiring: { status, confidence: 0.95, classificationMethod: 'pixels' } }
}

function networkWith(observations: Observation[]): Network {
  const dates = [...new Set(observations.map((observation) => observation.scanId))]
  return {
    people: [...new Set(observations.map((observation) => observation.personId))].map(person),
    scans: dates.map((scanDate) => ({ id: scanDate, scanDate, screenshots: [], cardsDetected: 0, duplicateCount: 0 })),
    observations,
  }
}

describe('how long people have been hiring', () => {
  it('counts from when the frame came back, not from when it was first ever seen', () => {
    const network = networkWith([seen('ana', '2026-09-01', 'HIRING'), seen('ana', '2026-09-10', 'NOT_HIRING'), seen('ana', '2026-09-20', 'HIRING'), seen('ana', '2026-09-22', 'HIRING')])
    expect(listHiringPeople(indexNetwork(network))[0]).toMatchObject({ firstSeenHiring: '2026-09-01', hiringSince: '2026-09-20', daysHiring: 3, scansSeenHiring: 2 })
  })
})
