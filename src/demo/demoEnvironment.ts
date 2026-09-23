import { createApiClient } from '@/shared-repositories/apiClient'
import type { TrackerEnvironment } from '@/shared-repositories/trackerEnvironment'
import { demoTransport } from './demoTransport'

export const demoEnvironment: TrackerEnvironment = { api: createApiClient(demoTransport), routeBase: '/demo', isDemo: true }

/** GitHub Pages build: there is no backend, so the whole site is the demo. */
export const isStaticDemoBuild = import.meta.env.VITE_STATIC_DEMO === 'true'
