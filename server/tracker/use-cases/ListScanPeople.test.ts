import { scanPeopleSchema } from '../../../contracts/api.ts'
import { answerRequest } from '../../app/HttpRouting.ts'
import { sampleTrackerRoutes } from '../../sample/DemoTrackers.ts'
import type { Network, Person, Scan } from '../../shared/domain/Observation.ts'
import { observationOf } from '../domain/tests/ObservationFixtures.ts'

function personNamed(id: string, displayName: string, companyName: string | null = null): Person {
  return { id, personHash: `hash-${id}`, displayName, headline: `Engineer at ${companyName ?? 'somewhere'}`, companyName, companyConfidence: 0.9, companyExtractionMethod: 'ocr-headline' }
}

function scanOn(scanDate: string): Scan {
  return { id: `followers-${scanDate}`, scanDate, screenshots: [], cardsDetected: 0, duplicateCount: 0 }
}

const zoe = personNamed('zoe', 'Zoe Adams', 'Globex')
const ann = personNamed('ann', 'Ann Brooks', 'Acme')
const mia = personNamed('mia', 'Mia Chen')
const earlier = scanOn('2026-09-21')
const latest = scanOn('2026-09-22')

const network: Network = {
  people: [zoe, ann, mia],
  scans: [earlier, latest],
  observations: [
    { ...observationOf(zoe.id, 'OPEN', 'NOT_HIRING'), scanId: earlier.id },
    { ...observationOf(zoe.id, 'NOT_OPEN', 'HIRING'), scanId: latest.id },
    { ...observationOf(ann.id, 'UNCERTAIN', 'UNCERTAIN'), scanId: latest.id },
    { ...observationOf(mia.id, 'OPEN', 'NOT_HIRING'), scanId: earlier.id },
  ],
}

const routes = sampleTrackerRoutes('followers', network)

async function peopleIn(scanId: string) {
  const response = await answerRequest(routes, { method: 'GET', path: `/api/scans/${scanId}/people`, query: {}, body: null })
  return { status: response.status, body: response.status === 200 ? scanPeopleSchema.parse(response.body) : null }
}

describe('listing everyone saved for a scan', () => {
  it('lists only the people seen in that scan, sorted by name', async () => {
    const { body } = await peopleIn(latest.id)

    expect(body?.people.map((person) => person.displayName)).toEqual(['Ann Brooks', 'Zoe Adams'])
  })

  it("gives each person's headline, company, and the frames they showed in that scan", async () => {
    const { body } = await peopleIn(earlier.id)

    expect(body?.people[1]).toEqual({ personId: 'zoe', displayName: 'Zoe Adams', headline: 'Engineer at Globex', companyName: 'Globex', openToWork: 'OPEN', hiring: 'NOT_HIRING' })
  })

  it('names the scan date', async () => {
    const { body } = await peopleIn(earlier.id)

    expect(body?.scanDate).toBe('2026-09-21')
  })

  it('lists the most recent scan when asked for the latest', async () => {
    const { body } = await peopleIn('latest')

    expect([body?.scanId, body?.people.length]).toEqual([latest.id, 2])
  })

  it('answers not found for a scan that does not exist', async () => {
    expect((await peopleIn('followers-1999-01-01')).status).toBe(404)
  })

  it('answers not found for the latest scan before any scan exists', async () => {
    const empty = sampleTrackerRoutes('followers', { people: [], scans: [], observations: [] })

    expect((await answerRequest(empty, { method: 'GET', path: '/api/scans/latest/people', query: {}, body: null })).status).toBe(404)
  })
})
