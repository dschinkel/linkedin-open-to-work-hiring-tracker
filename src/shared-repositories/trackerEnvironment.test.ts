import { networkSizeSchema } from '@contracts/api'
import type { Transport, TransportRequest } from './apiClient'
import { trackerEnvironmentFor } from './trackerEnvironment'

function recordingTransport() {
  const requests: TransportRequest[] = []
  const transport: Transport = async (request) => {
    requests.push(request)
    return { status: 200, body: { peopleCount: 312, latestScanDate: '2026-09-22' } }
  }
  return { transport, requests }
}

describe('tracker environment', () => {
  it('keeps demo pages under the demo address for the chosen audience', () => {
    const environment = trackerEnvironmentFor('demo', 'contacts', recordingTransport().transport)

    expect(environment.routeBase).toBe('/demo/contacts')
  })

  it('keeps live pages directly under the chosen audience', () => {
    const environment = trackerEnvironmentFor('live', 'followers', recordingTransport().transport)

    expect(environment.routeBase).toBe('/followers')
  })

  it('knows when it is showing the demo', () => {
    const environment = trackerEnvironmentFor('demo', 'followers', recordingTransport().transport)

    expect(environment).toMatchObject({ isDemo: true, audience: 'followers' })
  })

  it('knows when it is showing real data', () => {
    const environment = trackerEnvironmentFor('live', 'contacts', recordingTransport().transport)

    expect(environment).toMatchObject({ isDemo: false, audience: 'contacts' })
  })

  it('reads data for its own audience only', async () => {
    const { transport, requests } = recordingTransport()

    await trackerEnvironmentFor('demo', 'contacts', transport).api.getJson('/network-size', networkSizeSchema)

    expect(requests[0].path).toBe('/api/contacts/network-size')
  })

  it("reaches another audience's data when asked for it by name", async () => {
    const { transport, requests } = recordingTransport()

    await trackerEnvironmentFor('live', 'followers', transport).apiFor('contacts').getJson('/network-size', networkSizeSchema)

    expect(requests[0].path).toBe('/api/contacts/network-size')
  })
})
