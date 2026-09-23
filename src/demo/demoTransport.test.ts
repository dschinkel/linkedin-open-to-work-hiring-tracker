import { dashboardSchema } from '@contracts/api'
import { demoTransport } from './demoTransport'

describe('demo', () => {
  it('always shows the same static sample network, ending Sep 22, 2026', async () => {
    const response = await demoTransport({ method: 'GET', path: '/api/dashboard' })

    expect(dashboardSchema.parse(response.body).latestScan?.scanDate).toBe('2026-09-22')
  })

  it('validates query parameters like the real API', async () => {
    const response = await demoTransport({ method: 'GET', path: '/api/scans?window=forever' })

    expect(response.status).toBe(400)
  })
})
