import { createContext, useContext } from 'react'
import type { Audience } from '@contracts/api'
import { type ApiClient, createApiClient, httpTransport, type Transport } from './apiClient'

export type TrackerMode = 'live' | 'demo'

/** Which data the pages show (real API or in-browser demo, contacts or followers) and where their routes live. */
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

export const TrackerEnvironmentContext = createContext<TrackerEnvironment>(trackerEnvironmentFor('live', 'contacts', httpTransport))

export function useTrackerEnvironment(): TrackerEnvironment {
  return useContext(TrackerEnvironmentContext)
}

/** Builds an in-app link that stays inside the current tracker (e.g. "/hiring" → "/demo/followers/hiring"). */
export function useAppPath(): (path: string) => string {
  const { routeBase } = useTrackerEnvironment()
  return (path) => `${routeBase}${path}`
}
