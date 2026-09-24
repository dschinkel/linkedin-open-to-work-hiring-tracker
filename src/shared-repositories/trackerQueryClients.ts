import { QueryClient } from '@tanstack/react-query'
import type { AudienceChoice } from '@contracts/api'
import type { TrackerMode } from './trackerEnvironment'

const liveRefreshMilliseconds = 5_000

const sizeClients = new Map<TrackerMode, QueryClient>()

const trackerClients = new Map<string, QueryClient>()

export function sizeClientFor(mode: TrackerMode): QueryClient {
  if (!sizeClients.has(mode)) sizeClients.set(mode, queryClientFor(mode))
  return sizeClients.get(mode)!
}

export function trackerClientFor(mode: TrackerMode, audience: AudienceChoice): QueryClient {
  const key = `${mode}-${audience}`
  if (!trackerClients.has(key)) trackerClients.set(key, queryClientFor(mode))
  return trackerClients.get(key)!
}

export function refreshEveryTracker(): void {
  for (const client of [...sizeClients.values(), ...trackerClients.values()]) void client.invalidateQueries()
}

export function forgetCachedTrackers(): void {
  sizeClients.clear()
  trackerClients.clear()
}

function queryClientFor(mode: TrackerMode): QueryClient {
  const refetchInterval = mode === 'live' ? liveRefreshMilliseconds : false
  return new QueryClient({ defaultOptions: { queries: { staleTime: 0, refetchInterval, refetchOnWindowFocus: mode === 'live' } } })
}
