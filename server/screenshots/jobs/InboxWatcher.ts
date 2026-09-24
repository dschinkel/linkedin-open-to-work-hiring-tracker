import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { watch } from 'chokidar'
import { acceptedScreenshotName, isPdfName, refusalReason } from '../domain/ScreenshotFileName.ts'

interface InboxWatch {
  folderPath: string
  onScreenshotFound: (fileName: string) => void
  onFileSkipped: (fileName: string, reason: string) => void
}

export const watchInbox = ({ folderPath, onScreenshotFound, onFileSkipped }: InboxWatch): (() => Promise<void>) => {
  mkdirSync(folderPath, { recursive: true })
  const watcher = watch(folderPath, { depth: 0, awaitWriteFinish: { stabilityThreshold: 800, pollInterval: 100 } })
  watcher.on('add', (filePath) => {
    const baseName = path.basename(filePath)
    const fileName = acceptedScreenshotName(baseName)
    if (fileName) onScreenshotFound(fileName)
    else if (isPdfName(baseName)) onFileSkipped(baseName, refusalReason(baseName))
  })
  return () => watcher.close()
}
