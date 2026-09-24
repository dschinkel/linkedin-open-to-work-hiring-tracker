import type { ScanPeople } from '../../../contracts/api.ts'
import { listScanPeople as listPeopleIn } from '../domain/ScanPeople.ts'
import type { TrackerPorts } from '../domain/TrackerAnalytics.ts'

/** Scan id that stands for the most recent scan, e.g. to export it from the Scans page. */
export const latestScanId = 'latest'

/** Everyone saved for one scan (or the latest one), for exporting. Null when there is no such scan. */
export const listScanPeople = ({ analytics, trackerStore }: TrackerPorts) => ({
  listScanPeople: (scanId: string): ScanPeople | null => {
    const wantedId = scanId === latestScanId ? analytics().timeline.at(-1)?.id : scanId
    const saved = wantedId ? trackerStore.readScan(wantedId) : null
    return saved ? listPeopleIn(saved) : null
  },
})
