import type { AddScreenshotsRequest, AddScreenshotsResult } from '../../../contracts/api.ts'
import type { TrackerStore } from '../../tracker/outbound/persistence/TrackerStore.ts'
import { acceptedScreenshotName, refusalReason } from '../domain/ScreenshotFileName.ts'
import type { InboxFolder } from '../outbound/filesystem/InboxFolder.ts'
import type { AnalysisReport } from './AnalyzeInbox.ts'

interface AddScreenshotsPorts {
  inboxFolder: InboxFolder
  trackerStore: TrackerStore
  analyzeWaitingScreenshots: () => Promise<AnalysisReport>
}

type ScreenshotFile = AddScreenshotsRequest['files'][number]

/** Stores each acceptable screenshot once, then analyzes straight away. Anything seen before is skipped. */
export const addScreenshots = ({ inboxFolder, trackerStore, analyzeWaitingScreenshots }: AddScreenshotsPorts) => {
  const addOne = async (file: ScreenshotFile, result: AddScreenshotsResult): Promise<void> => {
    const name = acceptedScreenshotName(file.fileName)
    if (name === null) return void result.rejected.push({ fileName: file.fileName, reason: refusalReason(file.fileName) })
    if (trackerStore.knowsScreenshot(name)) return void result.rejected.push({ fileName: name, reason: 'Already imported' })
    if ((await inboxFolder.store(name, file.dataBase64)) === 'already-present') return void result.rejected.push({ fileName: name, reason: 'Already in the inbox' })
    trackerStore.recordWaitingScreenshot(name)
    result.saved.push(name)
  }

  const addScreenshots = async (request: AddScreenshotsRequest): Promise<AddScreenshotsResult> => {
    const result: AddScreenshotsResult = { saved: [], rejected: [], analysisMessage: '', importedCount: 0, failedCount: 0, peopleInScan: 0, message: '' }
    for (const file of request.files) await addOne(file, result)
    const report = result.saved.length > 0 ? await analyzeWaitingScreenshots() : null
    const analysisMessage = report ? describeAnalysis(report) : ''
    return {
      ...result,
      analysisMessage,
      importedCount: report?.importedFiles.length ?? 0,
      failedCount: report?.failedFiles.length ?? 0,
      peopleInScan: report?.peopleFound ?? 0,
      message: `${describeAdded(result)} ${analysisMessage}`.trim(),
    }
  }

  return { addScreenshots }
}

function describeAdded(result: AddScreenshotsResult): string {
  const saved = `${result.saved.length} screenshot${result.saved.length === 1 ? '' : 's'} added`
  return result.rejected.length === 0 ? `${saved}.` : `${saved}, ${result.rejected.length} skipped.`
}

export function describeAnalysis(report: AnalysisReport): string {
  const imported = report.importedFiles.length > 0 ? `Imported ${report.importedFiles.length}: ${report.peopleFound} people saved.` : ''
  const failed = report.failedFiles.length > 0 ? `${report.failedFiles.length} couldn't be read and stayed in the inbox.` : ''
  return [imported, failed].filter(Boolean).join(' ')
}
