import type { Dashboard, Settings } from '../../../contracts/api.ts'
import { daysBetween } from '../../shared/domain/ScanDate.ts'
import { whoIsHiringAmong } from '../domain/HiringPeople.ts'
import { scanQuality } from '../domain/ScanQuality.ts'
import type { Analytics, TrackerPorts } from '../domain/TrackerAnalytics.ts'

export const viewDashboard = ({ analytics, trackerStore, today }: TrackerPorts) => ({
  viewDashboard: (): Dashboard => ({
    ...dashboardOf(analytics(), trackerStore.waitingScreenshotCount()),
    scanReminder: scanReminder(analytics().index.scansInOrder.at(-1)?.scanDate ?? null, trackerStore.readSettings().scanFrequency, today()),
  }),
})

function dashboardOf({ index, timeline, hiringPeople }: Analytics, inboxWaitingCount: number): Omit<Dashboard, 'scanReminder'> {
  const latestScan = index.scansInOrder.at(-1)
  return {
    scanCount: timeline.length,
    inboxWaitingCount,
    latestScan: timeline.at(-1) ?? null,
    latestQuality: latestScan ? scanQuality(latestScan, index) : null,
    whoIsHiring: whoIsHiringAmong(hiringPeople),
  }
}

const daysBetweenScans: Record<Settings['scanFrequency'], number> = { daily: 1, weekly: 7, biweekly: 14, monthly: 30 }
const frequencyNames: Record<Settings['scanFrequency'], string> = { daily: 'daily', weekly: 'weekly', biweekly: 'every-2-weeks', monthly: 'monthly' }

export function scanReminder(lastScanDate: string | null, frequency: Settings['scanFrequency'], today: string): string | null {
  if (lastScanDate === null) return null
  const daysSince = daysBetween(lastScanDate, today)
  if (daysSince < daysBetweenScans[frequency]) return null
  return `Your ${frequencyNames[frequency]} scan is due: the last one was ${daysSince === 1 ? 'yesterday' : `${daysSince} days ago`}.`
}
