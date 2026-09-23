import { networkSizeSchema } from '@contracts/api'
import { ApiError, createApiClient, type Transport, type TransportRequest } from './apiClient'

function transportAnswering(status: number, body: unknown) {
  const requests: TransportRequest[] = []
  const transport: Transport = async (request) => {
    requests.push(request)
    return { status, body }
  }
  return { transport, requests }
}

const followersSize = { peopleCount: 1_204, latestScanDate: '2026-09-22' }

describe('api client', () => {
  it('asks for data under the tracker it belongs to', async () => {
    const { transport, requests } = transportAnswering(200, followersSize)

    await createApiClient(transport, '/api/followers').getJson('/network-size', networkSizeSchema)

    expect(requests).toEqual([{ method: 'GET', path: '/api/followers/network-size' }])
  })

  it('returns the data the API answered with', async () => {
    const { transport } = transportAnswering(200, followersSize)

    const size = await createApiClient(transport, '/api/followers').getJson('/network-size', networkSizeSchema)

    expect(size).toEqual(followersSize)
  })

  it('sends changes with their method and body under the tracker it belongs to', async () => {
    const { transport, requests } = transportAnswering(200, followersSize)

    await createApiClient(transport, '/api/contacts').sendJson('PUT', '/network-size', networkSizeSchema, followersSize)

    expect(requests).toEqual([{ method: 'PUT', path: '/api/contacts/network-size', body: followersSize }])
  })

  it('reports a failed request with its status', async () => {
    const { transport } = transportAnswering(404, { error: 'Scan not found' })

    const request = createApiClient(transport, '/api/followers').getJson('/scans/missing', networkSizeSchema)

    await expect(request).rejects.toMatchObject({ status: 404 })
  })

  it('treats a server error as an api error', async () => {
    const { transport } = transportAnswering(500, { error: 'Database locked' })

    const request = createApiClient(transport, '/api/followers').getJson('/network-size', networkSizeSchema)

    await expect(request).rejects.toBeInstanceOf(ApiError)
  })

  it('rejects an answer that breaks the contract', async () => {
    const { transport } = transportAnswering(200, { peopleCount: 'lots' })

    const request = createApiClient(transport, '/api/followers').getJson('/network-size', networkSizeSchema)

    await expect(request).rejects.toThrow()
  })
})
