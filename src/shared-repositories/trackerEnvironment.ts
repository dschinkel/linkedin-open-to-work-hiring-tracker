import { createContext, useContext } from 'react'
import { type ApiClient, createApiClient, httpTransport } from './apiClient'

/** Which data the pages show (the real API, or the in-browser demo) and where their routes live. */
export interface TrackerEnvironment {
  api: ApiClient
  routeBase: string
  isDemo: boolean
}

export const liveEnvironment: TrackerEnvironment = { api: createApiClient(httpTransport), routeBase: '', isDemo: false }

export const TrackerEnvironmentContext = createContext<TrackerEnvironment>(liveEnvironment)

export function useTrackerEnvironment(): TrackerEnvironment {
  return useContext(TrackerEnvironmentContext)
}

/** Builds an in-app link that stays inside the current environment (e.g. "/hiring" → "/demo/hiring"). */
export function useAppPath(): (path: string) => string {
  const { routeBase } = useTrackerEnvironment()
  return (path) => `${routeBase}${path}`
}
