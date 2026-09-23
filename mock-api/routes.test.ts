import { routeRequest } from './routes.ts'
import { createTrackerApi } from './trackerApi.ts'

const emptyApi = createTrackerApi(
  { people: [], scans: [], observations: [] },
  {
    inboxDirectory: 'LinkedinScreenShots/',
    archiveDirectory: 'data/screenshots/',
    automaticProcessing: true,
    openToWorkThresholds: { open: 0.9, notOpen: 0.1 },
    hiringThresholds: { hiring: 0.9, notHiring: 0.1 },
    visionFallback: false,
    scanFrequency: 'daily',
    retention: 'forever',
  },
)

describe('tracker API', () => {
  it('rejects an unknown time window', () => {
    expect(routeRequest(emptyApi, { method: 'GET', path: '/api/scans', query: { window: 'forever' }, body: null }).status).toBe(400)
  })

  it('reports no latest scan before any screenshots are processed', () => {
    const response = routeRequest(emptyApi, { method: 'GET', path: '/api/dashboard', query: {}, body: null })

    expect(response.body).toMatchObject({ scanCount: 0, latestScan: null })
  })
})
