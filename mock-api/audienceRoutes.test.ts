import { type AudienceApis, routeAudienceRequest } from './audienceRoutes.ts'
import { defaultSettingsFor } from './defaultSettings.ts'
import { generateSampleNetwork } from './seed/generateSampleNetwork.ts'
import { createTrackerApi } from './trackerApi.ts'
import { memoryStore } from './trackerStore.ts'

const options = {}
const apis: AudienceApis = {
  contacts: createTrackerApi(memoryStore({ people: [], scans: [], observations: [] }, defaultSettingsFor('contacts')), options),
  followers: createTrackerApi(memoryStore(generateSampleNetwork({ latestScanDate: '2026-09-22', days: 3, peopleCount: 20, seed: 1 }), defaultSettingsFor('followers')), options),
}

describe('contacts and followers', () => {
  it('keeps each audience in its own tracker', async () => {
    const contacts = await routeAudienceRequest(apis, { method: 'GET', path: '/api/contacts/dashboard', query: {}, body: null })
    const followers = await routeAudienceRequest(apis, { method: 'GET', path: '/api/followers/dashboard', query: {}, body: null })

    expect([contacts.body, followers.body]).toMatchObject([{ scanCount: 0 }, { scanCount: 3 }])
  })

  it('gives each audience its own screenshot inbox', () => {
    expect([defaultSettingsFor('contacts').inboxDirectory, defaultSettingsFor('followers').inboxDirectory]).toEqual([
      'LinkedinScreenShots/contacts/',
      'LinkedinScreenShots/followers/',
    ])
  })

  it('does not answer for an unknown audience', async () => {
    expect((await routeAudienceRequest(apis, { method: 'GET', path: '/api/strangers/dashboard', query: {}, body: null })).status).toBe(404)
  })
})
