import type { ScanDetail } from '../../../contracts/api.ts'
import { scanQuality } from '../domain/ScanQuality.ts'
import type { TrackerPorts } from '../domain/TrackerAnalytics.ts'

/** One scan in full: its summary, quality, and per-screenshot results. Null when there is no such scan. */
export const viewScan = ({ analytics }: TrackerPorts) => ({
  viewScan: (scanId: string): ScanDetail | null => {
    const { index, timeline } = analytics()
    const scan = index.scansInOrder.find((candidate) => candidate.id === scanId)
    const summary = timeline.find((candidate) => candidate.id === scanId)
    if (!scan || !summary) return null
    return { summary, quality: scanQuality(scan, index), screenshots: scan.screenshots }
  },
})
