import { routeRequest } from './routes.ts'
import { defaultSettingsFor } from './defaultSettings.ts'
import { createTrackerApi } from './trackerApi.ts'

const emptyApi = createTrackerApi(
  { people: [], scans: [], observations: [] },
  defaultSettingsFor('contacts'),
  {},
)

describe('tracker API', () => {
  it('rejects an unknown time window', async () => {
    expect((await routeRequest(emptyApi, { method: 'GET', path: '/api/scans', query: { window: 'forever' }, body: null })).status).toBe(400)
  })

  it('reports no latest scan before any screenshots are processed', async () => {
    const response = await routeRequest(emptyApi, { method: 'GET', path: '/api/dashboard', query: {}, body: null })

    expect(response.body).toMatchObject({ scanCount: 0, latestScan: null })
  })
})
