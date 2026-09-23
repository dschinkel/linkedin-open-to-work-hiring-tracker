import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { watch } from 'chokidar'
import { acceptedScreenshotName } from '../domain/ScreenshotFileName.ts'

interface InboxWatch {
  folderPath: string
  onScreenshotFound: (fileName: string) => void
}

/**
 * Inbound job: notices screenshots copied straight into an inbox folder (not just ones dropped in the app),
 * including any already sitting there at startup. Waits until a file has finished writing.
 */
export const watchInbox = ({ folderPath, onScreenshotFound }: InboxWatch): (() => Promise<void>) => {
  mkdirSync(folderPath, { recursive: true })
  const watcher = watch(folderPath, { depth: 0, awaitWriteFinish: { stabilityThreshold: 800, pollInterval: 100 } })
  watcher.on('add', (filePath) => {
    const fileName = acceptedScreenshotName(path.basename(filePath))
    if (fileName) onScreenshotFound(fileName)
  })
  return () => watcher.close()
}
