import type { Dashboard, Settings } from '../../../contracts/api.ts'
import { daysBetween } from '../../shared/domain/ScanDate.ts'
import { aggregateHiringCompanies, filterHiringPeople } from '../domain/HiringPeople.ts'
import { scanQuality } from '../domain/ScanQuality.ts'
import type { Analytics, TrackerPorts } from '../domain/TrackerAnalytics.ts'

const whoIsHiringPreviewSize = 6

/** The latest scan at a glance: Open-to-Work and Hiring, who's hiring, quality, and the inbox. */
export const viewDashboard = ({ analytics, trackerStore, today }: TrackerPorts) => ({
  viewDashboard: (): Dashboard => ({
    ...dashboardOf(analytics(), trackerStore.waitingScreenshotCount()),
    scanReminder: scanReminder(analytics().index.scansInOrder.at(-1)?.scanDate ?? null, trackerStore.readSettings().scanFrequency, today()),
  }),
})

function dashboardOf({ index, timeline, hiringPeople }: Analytics, inboxWaitingCount: number): Omit<Dashboard, 'scanReminder'> {
  const latestScan = index.scansInOrder.at(-1)
  const currentlyHiring = filterHiringPeople(hiringPeople, { search: '', company: '', status: 'current', companyKnown: 'all', sort: 'lastSeen' })
  return {
    scanCount: timeline.length,
    inboxWaitingCount,
    latestScan: timeline.at(-1) ?? null,
    latestQuality: latestScan ? scanQuality(latestScan, index) : null,
    whoIsHiring: {
      peopleCount: currentlyHiring.length,
      companyCount: aggregateHiringCompanies(hiringPeople).companies.length,
      preview: currentlyHiring.slice(0, whoIsHiringPreviewSize),
    },
  }
}

const daysBetweenScans: Record<Settings['scanFrequency'], number> = { daily: 1, weekly: 7, biweekly: 14, monthly: 30 }
const frequencyNames: Record<Settings['scanFrequency'], string> = { daily: 'daily', weekly: 'weekly', biweekly: 'every-2-weeks', monthly: 'monthly' }

/** A nudge once the chosen scan frequency has passed since the last scan. No reminder before the first scan. */
export function scanReminder(lastScanDate: string | null, frequency: Settings['scanFrequency'], today: string): string | null {
  if (lastScanDate === null) return null
  const daysSince = daysBetween(lastScanDate, today)
  if (daysSince < daysBetweenScans[frequency]) return null
  return `Your ${frequencyNames[frequency]} scan is due: the last one was ${daysSince === 1 ? 'yesterday' : `${daysSince} days ago`}.`
}
