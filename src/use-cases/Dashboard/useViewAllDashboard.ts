import { useQuery } from '@tanstack/react-query'
import type { AllDashboard } from '@contracts/api'
import type { LoadStatus } from '@/components/AsyncContent'
import type { StatTileView } from '@/components/StatTile'
import { formatCount, formatLongDate, formatPercent } from '@/shared-formatting/formatMetric'
import { useAppPath, useTrackerEnvironment } from '@/shared-repositories/trackerEnvironment'
import { loadStatusOf } from '@/shared-state/loadStatus'
import { describeHiringPerson, type HiringPersonRow } from '../Hiring/describeHiring'
import { describeScanQuality, type QualitySection } from '../Scan/describeScanQuality'
import { type AllDashboardRepository, allDashboardRepositoryFor } from './AllDashboardRepository'
import { linkTile } from './linkTile'

export interface AllDashboardView {
  status: LoadStatus
  errorMessage: string
  hasScans: boolean
  latestScanLabel: string
  sampledCount: string
  audienceBreakdown: string
  openToWorkTiles: StatTileView[]
  hiringTiles: StatTileView[]
  whoIsHiringPeople: HiringPersonRow[]
  showNoHiringPeople: boolean
  qualitySections: QualitySection[]
  hiringHref: string
}

type AllDashboardFields = Omit<AllDashboardView, 'status' | 'errorMessage' | 'hiringHref'>

const changesNeedOneAudience = 'Pick Followers or Connections for changes over time'
const openToWorkChanges = ['7-day change', 'Newly open', 'Removed open', 'Net flow', 'Entry rate', 'Removal rate', 'Entry / exit']
const hiringChanges = ['Newly hiring', 'Removed hiring', 'Net hiring']

const noDashboard: AllDashboardFields = {
  hasScans: false,
  latestScanLabel: '',
  sampledCount: '',
  audienceBreakdown: '',
  openToWorkTiles: [],
  hiringTiles: [],
  whoIsHiringPeople: [],
  showNoHiringPeople: true,
  qualitySections: [],
}

export function useViewAllDashboard(injectedRepository?: AllDashboardRepository): AllDashboardView {
  const { api } = useTrackerEnvironment()
  const appPath = useAppPath()
  const repository = injectedRepository ?? allDashboardRepositoryFor(api)
  const query = useQuery({ queryKey: ['dashboard'], queryFn: repository.latest })
  const fields = describeAllDashboard(query.data)
  return {
    ...loadStatusOf(query),
    ...fields,
    hiringHref: appPath('/hiring'),
    openToWorkTiles: linkTile(fields.openToWorkTiles, 'Open to Work', appPath('/open-to-work')),
    hiringTiles: linkTile(fields.hiringTiles, 'Hiring people', appPath('/hiring')),
  }
}

function describeAllDashboard(dashboard: AllDashboard | undefined): AllDashboardFields {
  if (!dashboard || !hasAnyScan(dashboard)) return noDashboard
  const { followers, contacts, both } = dashboard.peopleByAudience
  return {
    hasScans: true,
    latestScanLabel: `Latest scans: ${scanDateOf('Followers', dashboard.latestScanDates.followers)} · ${scanDateOf('Connections', dashboard.latestScanDates.contacts)}`,
    sampledCount: formatCount(dashboard.peopleCount),
    audienceBreakdown: `Followers ${formatCount(followers)} · Connections ${formatCount(contacts)} · in both ${formatCount(both)}`,
    openToWorkTiles: describeOpenToWorkAcross(dashboard.openToWork),
    hiringTiles: describeHiringAcross(dashboard.hiring),
    whoIsHiringPeople: dashboard.whoIsHiring.preview.map((person) => describeHiringPerson(person)),
    showNoHiringPeople: dashboard.whoIsHiring.peopleCount === 0,
    qualitySections: dashboard.latestQuality ? describeScanQuality(dashboard.latestQuality) : [],
  }
}

function hasAnyScan(dashboard: AllDashboard): boolean {
  return dashboard.latestScanDates.followers !== null || dashboard.latestScanDates.contacts !== null
}

function scanDateOf(audience: string, scanDate: string | null): string {
  if (scanDate === null) return `${audience} not scanned yet`
  return `${audience} ${formatLongDate(scanDate)}`
}

function describeOpenToWorkAcross(summary: AllDashboard['openToWork']): StatTileView[] {
  return [
    { label: 'Open rate', value: formatPercent(summary.rate), hint: unclearPhotosHint(summary.uncertain) },
    { label: 'Open to Work', value: formatCount(summary.open), hint: `of ${formatCount(summary.open + summary.notOpen)} read` },
    ...changesLeftToOneAudience(openToWorkChanges),
  ]
}

function describeHiringAcross(summary: AllDashboard['hiring']): StatTileView[] {
  return [
    { label: 'Hiring rate', value: formatPercent(summary.rate), hint: unclearPhotosHint(summary.uncertain) },
    { label: 'Hiring people', value: formatCount(summary.hiring), hint: `of ${formatCount(summary.hiring + summary.notHiring)} read` },
    { label: 'Companies', value: formatCount(summary.companyCount), hint: 'Clearly visible on cards' },
    ...changesLeftToOneAudience(hiringChanges),
  ]
}

function unclearPhotosHint(uncertain: number): string | undefined {
  if (uncertain === 0) return undefined
  return `${uncertain} unclear photos not counted`
}

function changesLeftToOneAudience(labels: string[]): StatTileView[] {
  const [first, ...rest] = labels
  return [{ label: first, value: '—', hint: changesNeedOneAudience }, ...rest.map((label) => ({ label, value: '—' }))]
}
