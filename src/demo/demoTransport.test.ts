import { dashboardSchema } from '@contracts/api'
import { demoTransport } from './demoTransport'

describe('demo', () => {
  it('always shows the same static sample network, ending Sep 22, 2026', async () => {
    const response = await demoTransport({ method: 'GET', path: '/api/contacts/dashboard' })

    expect(dashboardSchema.parse(response.body).latestScan?.scanDate).toBe('2026-09-22')
  })

  it('has a separate followers network', async () => {
    const contacts = await demoTransport({ method: 'GET', path: '/api/contacts/dashboard' })
    const followers = await demoTransport({ method: 'GET', path: '/api/followers/dashboard' })

    expect(dashboardSchema.parse(followers.body).latestScan?.peopleCount).not.toBe(dashboardSchema.parse(contacts.body).latestScan?.peopleCount)
  })

  it('validates query parameters like the real API', async () => {
    const response = await demoTransport({ method: 'GET', path: '/api/contacts/scans?window=forever' })

    expect(response.status).toBe(400)
  })
})
