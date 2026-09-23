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
import { findHiringPeople } from '../tracker/use-cases/FindHiringPeople.ts'
import { listHiringCompanies } from '../tracker/use-cases/ListHiringCompanies.ts'
import { listScans } from '../tracker/use-cases/ListScans.ts'
import { measureNetworkSize } from '../tracker/use-cases/MeasureNetworkSize.ts'
import { viewDashboard } from '../tracker/use-cases/ViewDashboard.ts'
import { viewScan } from '../tracker/use-cases/ViewScan.ts'
import { viewTrends } from '../tracker/use-cases/ViewTrends.ts'

/** Composition for one audience (followers or contacts): its use cases wired to its routes. */
export const audienceTrackerRoutes = (trackerStore: TrackerStore, screenshotUseCases: ScreenshotUseCases, today: () => string = localToday): Route[] => {
  const ports = { analytics: trackerAnalytics(trackerStore), trackerStore, today }
  const useCases: TrackerUseCases = {
    ...viewDashboard(ports),
    ...listScans(ports),
    ...viewScan(ports),
    ...viewTrends(ports),
    ...findHiringPeople(ports),
    ...listHiringCompanies(ports),
    ...findDepartedPeople(ports),
    ...measureNetworkSize(ports),
    ...editSettings(ports),
  }
  return [...trackerRoutes(trackerHttp(useCases)), ...screenshotRoutes(screenshotsHttp(screenshotUseCases))]
}

function localToday(): string {
  const now = new Date()
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((part) => String(part).padStart(2, '0')).join('-')
}
