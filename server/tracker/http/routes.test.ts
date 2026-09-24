import { answerRequest } from '../../app/HttpRouting.ts'
import { sampleTrackerRoutes } from '../../sample/DemoTrackers.ts'

const routes = sampleTrackerRoutes('followers', { people: [], scans: [], observations: [] })

describe('tracker API contract', () => {
  it('rejects an unknown time window', async () => {
    expect((await answerRequest(routes, { method: 'GET', path: '/api/scans', query: { window: 'forever' }, body: null })).status).toBe(400)
  })

  it('reports no latest scan before any screenshots are processed', async () => {
    const response = await answerRequest(routes, { method: 'GET', path: '/api/dashboard', query: {}, body: null })

    expect(response.body).toMatchObject({ scanCount: 0, latestScan: null })
  })

  it('rejects settings that break the contract', async () => {
    const response = await answerRequest(routes, { method: 'PUT', path: '/api/settings', query: {}, body: { inboxDirectory: '' } })

    expect(response.status).toBe(400)
  })

  it('answers unknown paths with not found', async () => {
    expect((await answerRequest(routes, { method: 'GET', path: '/api/nope', query: {}, body: null })).status).toBe(404)
  })
})

describe('clearing sample data', () => {
  it("says the sample has nothing of the user's to clear for one audience", async () => {
    const response = await answerRequest(routes, { method: 'DELETE', path: '/api/data', query: {}, body: null })

    expect([response.status, (response.body as { message: string }).message]).toEqual([200, expect.stringContaining('sample data')])
  })
})
