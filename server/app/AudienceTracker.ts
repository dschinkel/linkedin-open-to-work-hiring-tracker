import type { ProcessingResult } from '../../contracts/api.ts'
import type { Route } from './HttpRouting.ts'
import type { ScreenshotUseCases } from '../screenshots/http/ScreenshotsHttp.ts'
import { screenshotsHttp } from '../screenshots/http/ScreenshotsHttp.ts'
import { screenshotRoutes } from '../screenshots/http/routes.ts'
import { trackerAnalytics } from '../tracker/domain/TrackerAnalytics.ts'
import { trackerHttp, type TrackerUseCases } from '../tracker/http/TrackerHttp.ts'
import { trackerRoutes } from '../tracker/http/routes.ts'
import type { TrackerStore } from '../tracker/outbound/persistence/TrackerStore.ts'
import { editSettings } from '../tracker/use-cases/EditSettings.ts'
import { findDepartedPeople } from '../tracker/use-cases/FindDepartedPeople.ts'
import { findOpenToWorkPeople } from '../tracker/use-cases/FindOpenToWorkPeople.ts'
import { findHiringPeople } from '../tracker/use-cases/FindHiringPeople.ts'
import { keepSnapshots } from '../tracker/use-cases/KeepSnapshots.ts'
import { listHiringCompanies } from '../tracker/use-cases/ListHiringCompanies.ts'
import { listScanPeople } from '../tracker/use-cases/ListScanPeople.ts'
import { listScans } from '../tracker/use-cases/ListScans.ts'
import { measureNetworkSize } from '../tracker/use-cases/MeasureNetworkSize.ts'
import { viewDashboard } from '../tracker/use-cases/ViewDashboard.ts'
import { viewScan } from '../tracker/use-cases/ViewScan.ts'
import { viewTitleTrends } from '../tracker/use-cases/ViewTitleTrends.ts'
import { viewTrends } from '../tracker/use-cases/ViewTrends.ts'

export interface AudienceTrackerParts {
  trackerStore: TrackerStore
  screenshots: ScreenshotUseCases
  clearAllData: () => Promise<ProcessingResult>
  clearAudienceData: () => Promise<ProcessingResult>
  today?: () => string
  now?: () => Date
}

export const audienceTrackerRoutes = ({ trackerStore, screenshots, clearAllData, clearAudienceData, today = localToday, now = () => new Date() }: AudienceTrackerParts): Route[] => {
  const ports = { analytics: trackerAnalytics(trackerStore), trackerStore, today }
  const useCases: TrackerUseCases = {
    ...viewDashboard(ports),
    ...listScans(ports),
    ...viewScan(ports),
    ...listScanPeople(ports),
    ...viewTrends(ports),
    ...viewTitleTrends(ports),
    ...findHiringPeople(ports),
    ...listHiringCompanies(ports),
    ...findOpenToWorkPeople(ports),
    ...findDepartedPeople(ports),
    ...measureNetworkSize(ports),
    ...editSettings(ports),
    clearAllData,
    clearAudienceData,
    ...keepSnapshots({ ...ports, now, newSnapshotId: () => crypto.randomUUID() }),
  }
  return [...trackerRoutes(trackerHttp(useCases)), ...screenshotRoutes(screenshotsHttp(screenshots))]
}

function localToday(): string {
  const now = new Date()
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((part) => String(part).padStart(2, '0')).join('-')
}
