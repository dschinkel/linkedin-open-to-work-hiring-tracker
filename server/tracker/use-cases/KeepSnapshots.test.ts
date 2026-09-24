import { hiringSnapshotSchema, snapshotListSchema, snapshotSchema, snapshotSummarySchema } from '../../../contracts/api.ts'
import { audienceTrackerRoutes } from '../../app/AudienceTracker.ts'
import { answerRequest } from '../../app/HttpRouting.ts'
import type { Network, Person, Scan } from '../../shared/domain/Observation.ts'
import { defaultSettingsFor } from '../domain/DefaultSettings.ts'
import { observationOf } from '../domain/tests/ObservationFixtures.ts'
import { memoryTrackerStore } from '../outbound/persistence/MemoryTrackerStore.ts'

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
    { ...observationOf(zoe.id, 'OPEN', 'HIRING'), scanId: latest.id },
    { ...observationOf(ann.id, 'NOT_OPEN', 'HIRING'), scanId: latest.id },
    { ...observationOf(mia.id, 'NOT_OPEN', 'HIRING'), scanId: earlier.id },
    { ...observationOf(mia.id, 'NOT_OPEN', 'NOT_HIRING'), scanId: latest.id },
  ],
}

const previouslyHiring = { search: '', company: '', status: 'previous', companyKnown: 'all', sort: 'lastSeen' }

/** A followers tracker on sample data, with a clock that moves a minute forward on every save. */
function trackerWithClock() {
  const trackerStore = memoryTrackerStore(network, defaultSettingsFor('followers'))
  let minute = 0
  const routes = audienceTrackerRoutes({
    trackerStore,
    screenshots: { addScreenshots: async () => Promise.reject(new Error('unused')), reprocessScan: async () => ({ message: '' }) },
    clearAllData: async () => ({ message: '' }),
    today: () => '2026-09-22',
    now: () => new Date(2026, 8, 23, 10, minute++),
  })
  const call = (method: 'GET' | 'POST' | 'DELETE', path: string, query: Record<string, string> = {}, body: unknown = null) => answerRequest(routes, { method, path, query, body })
  return { trackerStore, call }
}

async function saved(call: ReturnType<typeof trackerWithClock>['call'], kind: string, body: unknown = {}) {
  return snapshotSummarySchema.parse((await call('POST', '/api/snapshots', { kind }, body)).body)
}

async function loaded(call: ReturnType<typeof trackerWithClock>['call'], id: string) {
  return snapshotSchema.parse((await call('GET', `/api/snapshots/${id}`)).body)
}

describe('saving a snapshot of a list', () => {
  it('names an unnamed snapshot after the day it was saved and how many people it holds', async () => {
    const { call } = trackerWithClock()
    expect(await saved(call, 'open-to-work')).toMatchObject({ kind: 'open-to-work', name: 'Sep 23, 2026 · 1 person', peopleCount: 1 })
  })

  it('keeps the name it was given', async () => {
    const { call } = trackerWithClock()
    expect((await saved(call, 'hiring', { name: '  Before the layoffs ' })).name).toBe('Before the layoffs')
  })

  it('takes the open to work list from the saved scans, with each person as they were listed', async () => {
    const { call } = trackerWithClock()
    const { id } = await saved(call, 'open-to-work')

    expect((await loaded(call, id)).people).toEqual([
      { personId: 'zoe', displayName: 'Zoe Adams', headline: 'Engineer at Globex', companyName: 'Globex', firstSeenOpen: '2026-09-21', lastSeenOpen: '2026-09-22', openSince: '2026-09-21', daysOpen: 2, scansSeenOpen: 2, wasObservedInLatestScan: true },
    ])
  })

  it('takes the hiring list through the filters in effect', async () => {
    const { call } = trackerWithClock()
    const { id } = await saved(call, 'hiring', { filters: previouslyHiring })
    expect((await loaded(call, id)).people.map((person) => person.displayName)).toEqual(['Mia Chen'])
  })

  it('remembers the hiring filters it was taken with', async () => {
    const { call } = trackerWithClock()
    const { id } = await saved(call, 'hiring', { filters: previouslyHiring })
    expect(hiringSnapshotSchema.parse((await call('GET', `/api/snapshots/${id}`)).body).filters).toEqual(previouslyHiring)
  })

  it('uses the default hiring filters when none are sent', async () => {
    const { call } = trackerWithClock()
    const { id } = await saved(call, 'hiring')
    expect((await loaded(call, id)).people.map((person) => person.displayName)).toEqual(['Ann Brooks', 'Zoe Adams'])
  })

  it('keeps the list as it was after later scans change it', async () => {
    const { call, trackerStore } = trackerWithClock()
    const { id } = await saved(call, 'open-to-work')
    const next = scanOn('2026-09-23')
    trackerStore.saveAnalyzedDay({ scan: next, people: [zoe], observations: [{ ...observationOf(zoe.id, 'NOT_OPEN'), scanId: next.id }] })

    expect((await loaded(call, id)).people.map((person) => person.displayName)).toEqual(['Zoe Adams'])
  })

  it('rejects an unknown list', async () => {
    const { call } = trackerWithClock()
    expect((await call('POST', '/api/snapshots', { kind: 'departed' }, {})).status).toBe(400)
  })
})

describe('listing saved snapshots', () => {
  it("lists only that list's snapshots, newest first", async () => {
    const { call } = trackerWithClock()
    await saved(call, 'open-to-work', { name: 'First' })
    await saved(call, 'hiring', { name: 'Hiring one' })
    await saved(call, 'open-to-work', { name: 'Second' })

    const { snapshots } = snapshotListSchema.parse((await call('GET', '/api/snapshots', { kind: 'open-to-work' })).body)

    expect(snapshots.map((snapshot) => snapshot.name)).toEqual(['Second', 'First'])
  })

  it('leaves the people out of the list of snapshots', async () => {
    const { call } = trackerWithClock()
    await saved(call, 'open-to-work')
    expect(JSON.stringify((await call('GET', '/api/snapshots', { kind: 'open-to-work' })).body)).not.toContain('Zoe Adams')
  })
})

describe('deleting a snapshot', () => {
  it('removes it so it can no longer be loaded', async () => {
    const { call } = trackerWithClock()
    const { id } = await saved(call, 'open-to-work')

    await call('DELETE', `/api/snapshots/${id}`)

    expect((await call('GET', `/api/snapshots/${id}`)).status).toBe(404)
  })

  it('answers not found for a snapshot that does not exist', async () => {
    const { call } = trackerWithClock()
    expect((await call('DELETE', '/api/snapshots/nope')).status).toBe(404)
  })
})
