import { useQuery } from '@tanstack/react-query'
import type { Dashboard } from '@contracts/api'
import type { LoadStatus } from '@/components/AsyncContent'
import type { StatTileView } from '@/components/StatTile'
import { formatCount, formatLongDate } from '@/shared-formatting/formatMetric'
import { loadStatusOf } from '@/shared-state/loadStatus'
import { describeHiringPerson, describeHiringTiles, type HiringPersonRow } from '../Hiring/describeHiring'
import { describeOpenToWorkTiles } from '../OpenToWork/describeOpenToWork'
import { describeScanQuality, type QualitySection } from '../Scan/describeScanQuality'
import { type DashboardRepository, dashboardRepository } from './DashboardRepository'

export interface DashboardView {
  status: LoadStatus
  errorMessage: string
  hasScans: boolean
  showFirstRunInvite: boolean
  latestScanLabel: string
  sampleLabel: string
  openToWorkTiles: StatTileView[]
  hiringTiles: StatTileView[]
  whoIsHiringHeadline: string
  whoIsHiringPeople: HiringPersonRow[]
  showNoHiringPeople: boolean
  qualitySections: QualitySection[]
}

/** Latest snapshot at a glance: Open-to-Work stock and flow, Hiring, and how trustworthy the scan is. */
export function useViewDashboard(repository: DashboardRepository = dashboardRepository): DashboardView {
  const query = useQuery({ queryKey: ['dashboard'], queryFn: repository.latest })
  return { ...loadStatusOf(query), ...describeDashboard(query.data) }
}

type DashboardFields = Omit<DashboardView, 'status' | 'errorMessage'>

const noDashboard: DashboardFields = {
  hasScans: false,
  showFirstRunInvite: true,
  latestScanLabel: '',
  sampleLabel: '',
  openToWorkTiles: [],
  hiringTiles: [],
  whoIsHiringHeadline: '',
  whoIsHiringPeople: [],
  showNoHiringPeople: true,
  qualitySections: [],
}

function describeDashboard(dashboard: Dashboard | undefined): DashboardFields {
  const latest = dashboard?.latestScan
  if (!dashboard || !latest) return noDashboard
  return {
    hasScans: true,
    showFirstRunInvite: false,
    latestScanLabel: `Latest scan: ${formatLongDate(latest.scanDate)}`,
    sampleLabel: `${formatCount(latest.peopleCount)} people sampled · ${formatCount(dashboard.scanCount)} scans total`,
    openToWorkTiles: describeOpenToWorkTiles(latest.openToWork),
    hiringTiles: describeHiringTiles(latest.hiring),
    whoIsHiringHeadline: describeWhoIsHiring(dashboard.whoIsHiring),
    whoIsHiringPeople: dashboard.whoIsHiring.preview.map((person) => describeHiringPerson(person)),
    showNoHiringPeople: dashboard.whoIsHiring.peopleCount === 0,
    qualitySections: dashboard.latestQuality ? describeScanQuality(dashboard.latestQuality) : [],
  }
}

function describeWhoIsHiring(whoIsHiring: Dashboard['whoIsHiring']): string {
  return `${formatCount(whoIsHiring.peopleCount)} people currently displaying #HIRING · ${formatCount(whoIsHiring.companyCount)} companies identified`
}
