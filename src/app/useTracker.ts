import { QueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { NavItem } from '@/components/AppShell'
import { demoEnvironment, isStaticDemoBuild } from '@/demo/demoEnvironment'
import { liveEnvironment, type TrackerEnvironment } from '@/shared-repositories/trackerEnvironment'

export type TrackerMode = 'live' | 'demo'

export interface TrackerView {
  queryClient: QueryClient
  environment: TrackerEnvironment
  navItems: NavItem[]
  logoSrc: string
  showDemoBanner: boolean
  showDemoInvite: boolean
  showExitDemo: boolean
}

const pages = [
  { path: '', label: 'Dashboard' },
  { path: '/trends', label: 'Trends' },
  { path: '/hiring', label: 'Hiring' },
  { path: '/scans', label: 'Scans' },
  { path: '/settings', label: 'Settings' },
]

/** One tracker per mode, each with its own query cache so demo data never mixes with real data. */
export function useTracker(mode: TrackerMode): TrackerView {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } } }))
  const environment = mode === 'demo' ? demoEnvironment : liveEnvironment

  return {
    queryClient,
    environment,
    navItems: navItemsUnder(environment.routeBase),
    logoSrc: `${import.meta.env.BASE_URL}logo.svg`,
    showDemoBanner: environment.isDemo,
    showDemoInvite: !environment.isDemo,
    showExitDemo: environment.isDemo && !isStaticDemoBuild,
  }
}

function navItemsUnder(routeBase: string): NavItem[] {
  return pages.map((page) => ({ to: `${routeBase}${page.path}` || '/', label: page.label, isExact: page.path === '' }))
}
