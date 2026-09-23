import type { AddScreenshotsRequest, AddScreenshotsResult } from '../contracts/api.ts'
import { acceptedScreenshotName } from './domain/screenshotFileName.ts'

/** Port: where dropped screenshots go. The file-system adapter lives with the dev server. */
export interface ScreenshotInbox {
  store: (fileName: string, dataBase64: string) => Promise<'stored' | 'already-present'>
}

/** Stores each acceptable file once; a file already in the inbox is skipped, never duplicated. */
export async function addScreenshots(inbox: ScreenshotInbox, request: AddScreenshotsRequest): Promise<AddScreenshotsResult> {
  const result: AddScreenshotsResult = { saved: [], rejected: [], analysisMessage: '', message: '' }
  for (const file of request.files) await addOne(inbox, file, result)
  return { ...result, message: summarize(result) }
}

async function addOne(inbox: ScreenshotInbox, file: AddScreenshotsRequest['files'][number], result: AddScreenshotsResult): Promise<void> {
  const name = acceptedScreenshotName(file.fileName)
  if (name === null) return void result.rejected.push({ fileName: file.fileName, reason: 'Not a PNG, JPG, or WebP image' })
  const outcome = await inbox.store(name, file.dataBase64)
  if (outcome === 'already-present') return void result.rejected.push({ fileName: name, reason: 'Already in the inbox' })
  result.saved.push(name)
}

function summarize(result: AddScreenshotsResult): string {
  const saved = `${result.saved.length} screenshot${result.saved.length === 1 ? '' : 's'} added to the inbox`
  return result.rejected.length === 0 ? `${saved}.` : `${saved}, ${result.rejected.length} skipped.`
}
