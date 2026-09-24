import { QueryClient, useQueries } from '@tanstack/react-query'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { type Audience, audiences, type NetworkSize, networkSizeSchema } from '@contracts/api'
import type { NavItem } from '@/components/AppShell'
import type { SegmentLink } from '@/components/SegmentedLinks'
import { demoNetworks } from '../../server/sample/DemoNetworks.ts'
import { isStaticDemoBuild } from '@/demo/demoEnvironment'
import { departureTitles } from '@/use-cases/Departure/departureWording'
import { demoTransport } from '@/demo/demoTransport'
import { type ApiClient, httpTransport, type Transport } from '@/shared-repositories/apiClient'
import { formatCount } from '@/shared-formatting/formatMetric'
import { type TrackerEnvironment, type TrackerMode, trackerEnvironmentFor } from '@/shared-repositories/trackerEnvironment'

export interface TrackerView {
  queryClient: QueryClient
  environment: TrackerEnvironment
  navItems: NavItem[]
  audienceLinks: SegmentLink[]
  subtitle: string
  demoSampleDescription: string
  logoSrc: string
  showDemoBanner: boolean
  showDemoInvite: boolean
  showExitDemo: boolean
  demoHref: string
  exitDemoHref: string
}

const pages = [
  { path: '', label: 'Dashboard' },
  { path: '/trends', label: 'Trends' },
  { path: '/open-to-work', label: 'Open to Work' },
  { path: '/hiring', label: 'Hiring' },
  { path: '/scans', label: 'Scans' },
  { path: '/settings', label: 'Settings' },
]

const audienceToggle: Array<{ audience: Audience; label: string }> = [
  { audience: 'followers', label: 'Followers' },
  { audience: 'contacts', label: 'Connections' },
]

const subtitle = 'Your followers and connections open to work or hiring, tracked over time'

export function useTracker(mode: TrackerMode, audience: Audience): TrackerView {
  const location = useLocation()
  const [queryClient] = useState(() => trackerClientFor(mode, audience))
  const [transport] = useState<Transport>(() => (mode === 'demo' ? demoTransport : httpTransport))
  const [environment] = useState(() => trackerEnvironmentFor(mode, audience, transport))
  const [apisByAudience] = useState(() => apisFor(mode, transport))
  const sizes = useQueries(
    { queries: audiences.map((each) => ({ queryKey: ['network-size', mode, each], queryFn: () => apisByAudience[each].getJson('/network-size', networkSizeSchema) })) },
    sizeClientFor(mode),
  )
  const sizeByAudience = Object.fromEntries(audiences.map((each, position) => [each, sizes[position].data])) as Record<Audience, NetworkSize | undefined>

  return {
    queryClient,
    environment,
    navItems: navItemsUnder(environment.routeBase, audience),
    audienceLinks: audienceLinksFrom(location.pathname, environment, sizeByAudience),
    subtitle,
    demoSampleDescription: `${demoNetworks[audience].peopleCount} fictional ${audience} and 180 days of made-up scans ending Sep 22, 2026.`,
    logoSrc: `${import.meta.env.BASE_URL}logo-animated.svg`,
    showDemoBanner: environment.isDemo,
    showDemoInvite: !environment.isDemo,
    showExitDemo: environment.isDemo && !isStaticDemoBuild,
    demoHref: `/demo/${audience}`,
    exitDemoHref: `/${audience}`,
  }
}

const liveRefreshMilliseconds = 5_000

const sizeClients = new Map<TrackerMode, QueryClient>()

function sizeClientFor(mode: TrackerMode): QueryClient {
  if (!sizeClients.has(mode)) sizeClients.set(mode, queryClientFor(mode))
  return sizeClients.get(mode)!
}

export function forgetCachedTrackers(): void {
  sizeClients.clear()
  trackerClients.clear()
}

const trackerClients = new Map<string, QueryClient>()

function trackerClientFor(mode: TrackerMode, audience: Audience): QueryClient {
  const key = `${mode}-${audience}`
  if (!trackerClients.has(key)) trackerClients.set(key, queryClientFor(mode))
  return trackerClients.get(key)!
}

function queryClientFor(mode: TrackerMode): QueryClient {
  const refetchInterval = mode === 'live' ? liveRefreshMilliseconds : false
  return new QueryClient({ defaultOptions: { queries: { staleTime: 0, refetchInterval, refetchOnWindowFocus: mode === 'live' } } })
}

function apisFor(mode: TrackerMode, transport: Transport): Record<Audience, ApiClient> {
  return { contacts: trackerEnvironmentFor(mode, 'contacts', transport).api, followers: trackerEnvironmentFor(mode, 'followers', transport).api }
}

function describeSize(size: NetworkSize | undefined): string | undefined {
  if (!size) return undefined
  return formatCount(size.latestScanDate === null ? 0 : size.peopleCount)
}

function navItemsUnder(routeBase: string, audience: Audience): NavItem[] {
  const departurePage = { path: '/departed', label: departureTitles[audience] }
  const afterHiring = pages.findIndex((page) => page.path === '/hiring') + 1
  const withDeparture = [...pages.slice(0, afterHiring), departurePage, ...pages.slice(afterHiring)]
  return withDeparture.map((page) => ({ to: `${routeBase}${page.path}`, label: page.label, isExact: page.path === '' }))
}

function audienceLinksFrom(pathname: string, environment: TrackerEnvironment, sizes: Record<Audience, NetworkSize | undefined>): SegmentLink[] {
  const pageWithinTracker = pathname.slice(environment.routeBase.length)
  const modeBase = environment.isDemo ? '/demo' : ''
  return audienceToggle.map((option) => ({
    label: option.label,
    to: `${modeBase}/${option.audience}${pageWithinTracker}`,
    isActive: option.audience === environment.audience,
    detail: describeSize(sizes[option.audience]),
  }))
}
