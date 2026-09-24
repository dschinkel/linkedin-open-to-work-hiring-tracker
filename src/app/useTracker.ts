import { type QueryClient, useQueries } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { type AudienceChoice, audienceChoices, type NetworkSize, networkSizeSchema } from '@contracts/api'
import type { NavItem } from '@/components/AppShell'
import type { SegmentLink } from '@/components/SegmentedLinks'
import { demoNetworks } from '../../server/sample/DemoNetworks.ts'
import { isStaticDemoBuild } from '@/demo/demoEnvironment'
import { departureTitles } from '@/use-cases/Departure/departureWording'
import { demoTransport } from '@/demo/demoTransport'
import { type ApiClient, httpTransport, type Transport } from '@/shared-repositories/apiClient'
import { formatCount } from '@/shared-formatting/formatMetric'
import { type TrackerEnvironment, type TrackerMode, trackerEnvironmentFor } from '@/shared-repositories/trackerEnvironment'
import { sizeClientFor, trackerClientFor } from '@/shared-repositories/trackerQueryClients'

export interface TrackerView {
  queryClient: QueryClient
  environment: TrackerEnvironment
  navItems: NavItem[]
  audienceLinks: SegmentLink[]
  showsEveryPage: boolean
  listsHome: string
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

const listPages = ['/open-to-work', '/hiring']

const audienceToggle: Array<{ audience: AudienceChoice; label: string }> = [
  { audience: 'all', label: 'All' },
  { audience: 'followers', label: 'Followers' },
  { audience: 'contacts', label: 'Connections' },
]

const subtitle = 'Your followers and connections open to work or hiring, tracked over time'

export function useTracker(mode: TrackerMode, audience: AudienceChoice): TrackerView {
  const location = useLocation()
  const [transport] = useState<Transport>(() => (mode === 'demo' ? demoTransport : httpTransport))
  const queryClient = useMemo(() => trackerClientFor(mode, audience), [mode, audience])
  const environment = useMemo(() => trackerEnvironmentFor(mode, audience, transport), [mode, audience, transport])
  const [apisByAudience] = useState(() => apisFor(mode, transport))
  const sizes = useQueries(
    { queries: audienceChoices.map((each) => ({ queryKey: ['network-size', mode, each], queryFn: () => apisByAudience[each].getJson('/network-size', networkSizeSchema) })) },
    sizeClientFor(mode),
  )
  const sizeByAudience = Object.fromEntries(audienceChoices.map((each, position) => [each, sizes[position].data])) as Record<AudienceChoice, NetworkSize | undefined>

  return {
    queryClient,
    environment,
    navItems: navItemsUnder(environment.routeBase, audience),
    audienceLinks: audienceLinksFrom(location.pathname, environment, sizeByAudience),
    showsEveryPage: audience !== 'all',
    listsHome: `${environment.routeBase}${listPages[0]}`,
    subtitle,
    demoSampleDescription: `${describeDemoSample(audience)} and 180 days of made-up scans ending Sep 22, 2026.`,
    logoSrc: `${import.meta.env.BASE_URL}logo-animated.svg`,
    showDemoBanner: environment.isDemo,
    showDemoInvite: !environment.isDemo,
    showExitDemo: environment.isDemo && !isStaticDemoBuild,
    demoHref: `/demo/${audience}`,
    exitDemoHref: `/${audience}`,
  }
}

function apisFor(mode: TrackerMode, transport: Transport): Record<AudienceChoice, ApiClient> {
  return Object.fromEntries(audienceChoices.map((each) => [each, trackerEnvironmentFor(mode, each, transport).api])) as Record<AudienceChoice, ApiClient>
}

function describeDemoSample(audience: AudienceChoice): string {
  if (audience !== 'all') return `${demoNetworks[audience].peopleCount} fictional ${audience}`
  return `${demoNetworks.followers.peopleCount} fictional followers and ${demoNetworks.contacts.peopleCount} fictional contacts`
}

function describeSize(size: NetworkSize | undefined): string | undefined {
  if (!size) return undefined
  return formatCount(size.latestScanDate === null ? 0 : size.peopleCount)
}

function navItemsUnder(routeBase: string, audience: AudienceChoice): NavItem[] {
  const departurePage = { path: '/departed', label: departureTitles[audience] }
  const afterHiring = pages.findIndex((page) => page.path === '/hiring') + 1
  const withDeparture = [...pages.slice(0, afterHiring), departurePage, ...pages.slice(afterHiring)]
  const shown = audience === 'all' ? withDeparture.filter((page) => listPages.includes(page.path)) : withDeparture
  return shown.map((page) => ({ to: `${routeBase}${page.path}`, label: page.label, isExact: page.path === '' }))
}

function audienceLinksFrom(pathname: string, environment: TrackerEnvironment, sizes: Record<AudienceChoice, NetworkSize | undefined>): SegmentLink[] {
  const pageWithinTracker = pathname.slice(environment.routeBase.length)
  const modeBase = environment.isDemo ? '/demo' : ''
  return audienceToggle.map((option) => ({
    label: option.label,
    to: `${modeBase}/${option.audience}${pageFor(option.audience, pageWithinTracker)}`,
    isActive: option.audience === environment.audience,
    detail: describeSize(sizes[option.audience]),
  }))
}

function pageFor(audience: AudienceChoice, page: string): string {
  if (audience !== 'all') return page
  return listPages.find((listPage) => page === listPage || page.startsWith(`${listPage}/`)) ?? listPages[0]
}
