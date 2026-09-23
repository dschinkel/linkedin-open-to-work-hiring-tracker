import type { ScanHistory, TimeWindow } from '../../../contracts/api.ts'
import { withinWindow } from '../domain/TimeWindow.ts'
import type { TrackerPorts } from '../domain/TrackerAnalytics.ts'

/** Daily history, newest first, limited to a time window. */
export const listScans = ({ analytics }: TrackerPorts) => ({
  listScans: (window: TimeWindow): ScanHistory => ({ scans: withinWindow(analytics().timeline, window).reverse() }),
})
