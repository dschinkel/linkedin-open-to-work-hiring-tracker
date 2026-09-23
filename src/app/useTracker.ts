import { QueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { Audience } from '@contracts/api'
import type { NavItem } from '@/components/AppShell'
import type { SegmentLink } from '@/components/SegmentedLinks'
import { demoNetworks } from '../../mock-api/demoNetworks.ts'
import { isStaticDemoBuild } from '@/demo/demoEnvironment'
import { departureTitles } from '@/use-cases/Departure/departureWording'
import { demoTransport } from '@/demo/demoTransport'
import { httpTransport } from '@/shared-repositories/apiClient'
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
  { path: '/hiring', label: 'Hiring' },
  { path: '/scans', label: 'Scans' },
  { path: '/settings', label: 'Settings' },
]

const audienceToggle: Array<{ audience: Audience; label: string }> = [
  { audience: 'followers', label: 'Followers' },
  { audience: 'contacts', label: 'Contacts' },
]

const subtitles: Record<Audience, string> = {
  contacts: 'Your contacts (LinkedIn connections), tracked over time',
  followers: 'Your followers, tracked over time',
}

/** One tracker per mode and audience, each with its own query cache so their data never mixes. */
export function useTracker(mode: TrackerMode, audience: Audience): TrackerView {
  const location = useLocation()
  const [queryClient] = useState(() => queryClientFor(mode))
  const [environment] = useState(() => trackerEnvironmentFor(mode, audience, mode === 'demo' ? demoTransport : httpTransport))

  return {
    queryClient,
    environment,
    navItems: navItemsUnder(environment.routeBase, audience),
    audienceLinks: audienceLinksFrom(location.pathname, environment),
    subtitle: subtitles[audience],
    demoSampleDescription: `${demoNetworks[audience].peopleCount} fictional ${audience} and 180 days of made-up scans ending Sep 22, 2026.`,
    logoSrc: `${import.meta.env.BASE_URL}logo.svg`,
    showDemoBanner: environment.isDemo,
    showDemoInvite: !environment.isDemo,
    showExitDemo: environment.isDemo && !isStaticDemoBuild,
    demoHref: `/demo/${audience}`,
    exitDemoHref: `/${audience}`,
  }
}

/** Live pages re-check the API every few seconds so newly analyzed screenshots appear without a reload. */
const liveRefreshMilliseconds = 5_000

function queryClientFor(mode: TrackerMode): QueryClient {
  const refetchInterval = mode === 'live' ? liveRefreshMilliseconds : false
  return new QueryClient({ defaultOptions: { queries: { staleTime: 0, refetchInterval, refetchOnWindowFocus: mode === 'live' } } })
}

function navItemsUnder(routeBase: string, audience: Audience): NavItem[] {
  const departurePage = { path: '/departed', label: departureTitles[audience] }
  const withDeparture = [...pages.slice(0, 3), departurePage, ...pages.slice(3)]
  return withDeparture.map((page) => ({ to: `${routeBase}${page.path}`, label: page.label, isExact: page.path === '' }))
}

/** Switching audience keeps you on the same page, e.g. /demo/contacts/trends → /demo/followers/trends. */
function audienceLinksFrom(pathname: string, environment: TrackerEnvironment): SegmentLink[] {
  const pageWithinTracker = pathname.slice(environment.routeBase.length)
  const modeBase = environment.isDemo ? '/demo' : ''
  return audienceToggle.map((option) => ({
    label: option.label,
    to: `${modeBase}/${option.audience}${pageWithinTracker}`,
    isActive: option.audience === environment.audience,
  }))
}
