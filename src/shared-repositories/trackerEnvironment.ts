import { createContext, useContext } from 'react'
import type { Audience } from '@contracts/api'
import { type ApiClient, createApiClient, httpTransport, type Transport } from './apiClient'

export type TrackerMode = 'live' | 'demo'

export interface TrackerEnvironment {
  api: ApiClient
  routeBase: string
  isDemo: boolean
  audience: Audience
}

export function trackerEnvironmentFor(mode: TrackerMode, audience: Audience, transport: Transport): TrackerEnvironment {
  const modeBase = mode === 'demo' ? '/demo' : ''
  return {
    api: createApiClient(transport, `/api/${audience}`),
    routeBase: `${modeBase}/${audience}`,
    isDemo: mode === 'demo',
    audience,
  }
}

export const TrackerEnvironmentContext = createContext<TrackerEnvironment>(trackerEnvironmentFor('live', 'followers', httpTransport))

export function useTrackerEnvironment(): TrackerEnvironment {
  return useContext(TrackerEnvironmentContext)
}

export function useAppPath(): (path: string) => string {
  const { routeBase } = useTrackerEnvironment()
  return (path) => `${routeBase}${path}`
}
