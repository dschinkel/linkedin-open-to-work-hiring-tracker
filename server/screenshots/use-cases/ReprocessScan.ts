import type { Audience, ProcessingResult } from '../../../contracts/api.ts'
import type { TrackerStore } from '../../tracker/outbound/persistence/TrackerStore.ts'
import type { InboxFolder } from '../outbound/filesystem/InboxFolder.ts'
import type { CardReader } from '../outbound/vision/CardReader.ts'
import { mergeIntoDay } from './AnalyzeInbox.ts'

interface ReprocessScanPorts {
  audience: Audience
  trackerStore: TrackerStore
  inboxFolder: InboxFolder
  cardReader: CardReader
}

/** Re-reads a day's archived screenshots and replaces that day. Only possible when originals were kept. */
export const reprocessScan = ({ audience, trackerStore, inboxFolder, cardReader }: ReprocessScanPorts) => ({
  reprocessScan: async (scanId: string): Promise<ProcessingResult | null> => {
    const scan = trackerStore.readNetwork().scans.find((candidate) => candidate.id === scanId)
    if (!scan) return null
    const fileNames = await inboxFolder.archivedFiles(scan.scanDate)
    if (fileNames.length === 0) return { message: 'The original screenshots were deleted after import, so this scan cannot be re-read.' }
    const readings = await Promise.all(
      fileNames.map(async (fileName) => ({ fileName, cards: await cardReader.readCards(await inboxFolder.readArchived(fileName, scan.scanDate), fileName), failure: null })),
    )
    trackerStore.saveAnalyzedDay(mergeIntoDay(audience, scan.scanDate, readings, { existing: null, knownPeople: trackerStore.readNetwork().people }))
    return { message: `Re-read ${fileNames.length} archived screenshot${fileNames.length === 1 ? '' : 's'}.` }
  },
})
