import type { ScanPeople } from '../../../contracts/api.ts'
import { listScanPeople as listPeopleIn } from '../domain/ScanPeople.ts'
import type { TrackerPorts } from '../domain/TrackerAnalytics.ts'

export const latestScanId = 'latest'

export const listScanPeople = ({ analytics, trackerStore }: TrackerPorts) => ({
  listScanPeople: (scanId: string): ScanPeople | null => {
    const wantedId = scanId === latestScanId ? analytics().timeline.at(-1)?.id : scanId
    const saved = wantedId ? trackerStore.readScan(wantedId) : null
    return saved ? listPeopleIn(saved) : null
  },
})
