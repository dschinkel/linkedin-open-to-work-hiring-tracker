import { indexNetwork } from './NetworkIndex.ts'
import type { Network, Observation, OpenToWorkStatus, Person } from '../../shared/domain/Observation.ts'
import { listOpenToWorkPeople } from './OpenToWorkPeople.ts'

function person(id: string): Person {
  return { id, personHash: id, displayName: id, headline: 'Engineer', companyName: null, companyConfidence: null, companyExtractionMethod: 'unknown' }
}

function seen(personId: string, scanDate: string, status: OpenToWorkStatus): Observation {
  return { scanId: scanDate, personId, openToWork: { status, confidence: 0.95, classificationMethod: 'pixels' }, hiring: { status: 'NOT_HIRING', confidence: 0.95, classificationMethod: 'pixels' } }
}

const dates = ['2026-09-20', '2026-09-22']

function networkWith(observations: Observation[]): Network {
  return {
    people: [...new Set(observations.map((observation) => observation.personId))].map(person),
    scans: dates.map((scanDate) => ({ id: scanDate, scanDate, screenshots: [], cardsDetected: 0, duplicateCount: 0 })),
    observations,
  }
}

describe('people currently Open to Work', () => {
  it('lists someone whose latest reading shows the frame', () => {
    const network = networkWith([seen('ana', '2026-09-20', 'NOT_OPEN'), seen('ana', '2026-09-22', 'OPEN')])

    expect(listOpenToWorkPeople(indexNetwork(network)).map((open) => [open.displayName, open.firstSeenOpen])).toEqual([['ana', '2026-09-22']])
  })

  it('leaves out someone who has since removed the frame', () => {
    const network = networkWith([seen('ben', '2026-09-20', 'OPEN'), seen('ben', '2026-09-22', 'NOT_OPEN')])

    expect(listOpenToWorkPeople(indexNetwork(network))).toEqual([])
  })

  it('keeps someone open when their latest photo was unclear', () => {
    const network = networkWith([seen('cy', '2026-09-20', 'OPEN'), seen('cy', '2026-09-22', 'UNCERTAIN')])

    expect(listOpenToWorkPeople(indexNetwork(network))[0]).toMatchObject({ displayName: 'cy', wasObservedInLatestScan: false })
  })
})
