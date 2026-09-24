import { allDashboardSchema, companyHiringSchema, hiringPeopleSchema, networkSizeSchema, openToWorkPeopleSchema, snapshotListSchema, snapshotSchema, snapshotSummarySchema } from '../../../contracts/api.ts'
import { allAudiencesTrackerRoutes } from '../../app/AllAudiencesTracker.ts'
import { answerRequest } from '../../app/HttpRouting.ts'
import type { Network, Person, Scan } from '../../shared/domain/Observation.ts'
import { defaultSettingsFor } from '../domain/DefaultSettings.ts'
import { observationOf } from '../domain/tests/ObservationFixtures.ts'
import { memorySnapshotStore, memoryTrackerStore } from '../outbound/persistence/MemoryTrackerStore.ts'

function personNamed(id: string, displayName: string, headline: string, companyName: string | null = null): Person {
  return { id, personHash: `hash-${id}`, displayName, headline, companyName, companyConfidence: 0.9, companyExtractionMethod: 'ocr-headline' }
}

function scanOn(audience: string, scanDate: string): Scan {
  return { id: `${audience}-${scanDate}`, scanDate, screenshots: [], cardsDetected: 0, duplicateCount: 0 }
}

const zoeFollower = personNamed('f-zoe', 'Zoe Adams', 'Engineering Manager at Globex', 'Globex')
const annFollower = personNamed('f-ann', 'Ann Brooks', 'Recruiter at Acme', 'Acme')
const zoeConnection = personNamed('c-zoe', 'Zoe Adams', 'Engineering Manager at Globex', 'Globex')
const miaConnection = personNamed('c-mia', 'Mia Chen', 'Data Scientist at Umbrella')
const followersScan = scanOn('followers', '2026-09-22')
const connectionsScan = scanOn('contacts', '2026-09-21')

const followers: Network = {
  people: [zoeFollower, annFollower],
  scans: [followersScan],
  observations: [
    { ...observationOf(zoeFollower.id, 'OPEN', 'HIRING'), scanId: followersScan.id },
    { ...observationOf(annFollower.id, 'NOT_OPEN', 'HIRING'), scanId: followersScan.id },
  ],
}

const connections: Network = {
  people: [zoeConnection, miaConnection],
  scans: [connectionsScan],
  observations: [
    { ...observationOf(zoeConnection.id, 'OPEN', 'HIRING'), scanId: connectionsScan.id },
    { ...observationOf(miaConnection.id, 'OPEN', 'NOT_HIRING'), scanId: connectionsScan.id },
  ],
}

function allAudiences() {
  const followersStore = memoryTrackerStore(followers, defaultSettingsFor('followers'))
  const routes = allAudiencesTrackerRoutes({
    trackerStores: { followers: followersStore, contacts: memoryTrackerStore(connections, defaultSettingsFor('contacts')) },
    snapshotStore: memorySnapshotStore(),
    now: () => new Date(2026, 8, 24, 9, 0),
  })
  const call = async (method: 'GET' | 'POST', path: string, query: Record<string, string> = {}, body: unknown = null) => answerRequest(routes, { method, path, query, body })
  return { call, followersStore }
}

describe('open to work across followers and connections', () => {
  it('lists each person once and says where they were found', async () => {
    const { call } = allAudiences()

    const { people } = openToWorkPeopleSchema.parse((await call('GET', '/api/open-to-work/people')).body)

    expect(people.map((person) => [person.displayName, person.seenIn])).toEqual([
      ['Zoe Adams', 'both'],
      ['Mia Chen', 'contacts'],
    ])
  })
})

describe('hiring across followers and connections', () => {
  it('lists each hiring person once', async () => {
    const { call } = allAudiences()

    const { people } = hiringPeopleSchema.parse((await call('GET', '/api/hiring/people', { status: 'current' })).body)

    expect(people.map((person) => [person.displayName, person.seenIn])).toEqual([
      ['Ann Brooks', 'followers'],
      ['Zoe Adams', 'both'],
    ])
  })

  it('filters the merged list by company', async () => {
    const { call } = allAudiences()
    const { people } = hiringPeopleSchema.parse((await call('GET', '/api/hiring/people', { company: 'globex' })).body)
    expect(people.map((person) => person.displayName)).toEqual(['Zoe Adams'])
  })

  it('filters the merged list by whether the company is visible', async () => {
    const { call } = allAudiences()
    const { people } = hiringPeopleSchema.parse((await call('GET', '/api/hiring/people', { companyKnown: 'unknown' })).body)
    expect(people).toEqual([])
  })

  it('counts a company once per person, even when that person is in both audiences', async () => {
    const { call } = allAudiences()

    const { companies } = companyHiringSchema.parse((await call('GET', '/api/hiring/companies')).body)

    expect(companies).toEqual([
      { companyName: 'Acme', peopleCount: 1 },
      { companyName: 'Globex', peopleCount: 1 },
    ])
  })

  it('rejects filters that break the contract', async () => {
    const { call } = allAudiences()
    expect((await call('GET', '/api/hiring/people', { status: 'someday' })).status).toBe(400)
  })
})

describe('size of both audiences together', () => {
  it('counts someone who is both a follower and a connection once, as of the latest scan of either', async () => {
    const { call } = allAudiences()
    expect(networkSizeSchema.parse((await call('GET', '/api/network-size')).body)).toEqual({ peopleCount: 3, latestScanDate: '2026-09-22' })
  })
})

describe('snapshots of the merged lists', () => {
  it('saves the merged open to work list', async () => {
    const { call } = allAudiences()

    const { id } = snapshotSummarySchema.parse((await call('POST', '/api/snapshots', { kind: 'open-to-work' }, {})).body)

    const snapshot = snapshotSchema.parse((await call('GET', `/api/snapshots/${id}`)).body)
    expect(snapshot.people.map((person) => person.seenIn)).toEqual(['both', 'contacts'])
  })

  it('keeps them apart from the snapshots of each audience', async () => {
    const { call, followersStore } = allAudiences()

    await call('POST', '/api/snapshots', { kind: 'hiring' }, { name: 'Everyone hiring' })

    const { snapshots } = snapshotListSchema.parse((await call('GET', '/api/snapshots', { kind: 'hiring' })).body)
    expect([snapshots.map((snapshot) => snapshot.name), followersStore.listSnapshots('hiring')]).toEqual([['Everyone hiring'], []])
  })
})

describe('dashboard of both audiences together', () => {
  it('counts the people of both latest scans once each', async () => {
    const { call } = allAudiences()
    const dashboard = allDashboardSchema.parse((await call('GET', '/api/dashboard')).body)
    expect([dashboard.peopleCount, dashboard.peopleByAudience]).toEqual([3, { followers: 2, contacts: 2, both: 1 }])
  })

  it('rates open to work and hiring over those people', async () => {
    const { call } = allAudiences()
    const dashboard = allDashboardSchema.parse((await call('GET', '/api/dashboard')).body)
    expect([dashboard.openToWork.open, dashboard.hiring.hiring, dashboard.hiring.companyCount]).toEqual([2, 2, 2])
  })

  it('dates the latest scan of each audience', async () => {
    const { call } = allAudiences()
    const dashboard = allDashboardSchema.parse((await call('GET', '/api/dashboard')).body)
    expect(dashboard.latestScanDates).toEqual({ followers: '2026-09-22', contacts: '2026-09-21' })
  })

  it('previews the merged list of people hiring', async () => {
    const { call } = allAudiences()
    const { whoIsHiring } = allDashboardSchema.parse((await call('GET', '/api/dashboard')).body)
    expect([whoIsHiring.peopleCount, whoIsHiring.companyCount, whoIsHiring.preview.map((person) => person.seenIn)]).toEqual([2, 2, ['followers', 'both']])
  })
})

describe('pages that belong to one audience', () => {
  it('are not answered for both audiences together', async () => {
    const { call } = allAudiences()
    expect((await call('GET', '/api/trends')).status).toBe(404)
  })
})
