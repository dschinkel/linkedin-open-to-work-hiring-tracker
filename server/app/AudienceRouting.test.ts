import { generateSampleNetwork } from '../sample/SampleNetwork.ts'
import { sampleTrackers } from '../sample/DemoTrackers.ts'
import { defaultSettingsFor } from '../tracker/domain/DefaultSettings.ts'
import { answerAudienceRequest, type RoutesByAudience } from './AudienceRouting.ts'

const routesByAudience: RoutesByAudience = sampleTrackers({
  contacts: { people: [], scans: [], observations: [] },
  followers: generateSampleNetwork({ latestScanDate: '2026-09-22', days: 3, peopleCount: 20, seed: 1 }),
})

const get = (path: string) => answerAudienceRequest(routesByAudience, { method: 'GET', path, query: {}, body: null })

describe('contacts and followers', () => {
  it('keeps each audience in its own tracker', async () => {
    const [contacts, followers] = await Promise.all([get('/api/contacts/dashboard'), get('/api/followers/dashboard')])

    expect([contacts.body, followers.body]).toMatchObject([{ scanCount: 0 }, { scanCount: 3 }])
  })

  it('gives each audience its own screenshot inbox', () => {
    expect([defaultSettingsFor('contacts').inboxDirectory, defaultSettingsFor('followers').inboxDirectory]).toEqual(['LinkedinScreenShots/contacts/', 'LinkedinScreenShots/followers/'])
  })

  it('answers the open to work list of both audiences together', async () => {
    const [all, followers] = await Promise.all([get('/api/all/open-to-work/people'), get('/api/followers/open-to-work/people')])
    expect((all.body as { people: unknown[] }).people).toHaveLength((followers.body as { people: unknown[] }).people.length)
  })

  it('does not answer the pages that belong to one audience for both together', async () => {
    expect((await get('/api/all/trends')).status).toBe(404)
  })

  it('does not answer for an unknown audience', async () => {
    expect((await get('/api/strangers/dashboard')).status).toBe(404)
  })
})
