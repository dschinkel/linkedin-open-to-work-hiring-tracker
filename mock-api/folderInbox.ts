import { access, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { ScreenshotInbox } from './screenshotInbox.ts'

/** File-system adapter: writes screenshots into the inbox folder, which must stay inside the project. */
export function folderInbox(projectRoot: string, inboxDirectory: () => string): ScreenshotInbox {
  return {
    store: async (fileName, dataBase64) => {
      const folder = insideProject(projectRoot, inboxDirectory())
      const target = path.join(folder, fileName)
      if (await exists(target)) return 'already-present'
      await mkdir(folder, { recursive: true })
      await writeFile(target, Buffer.from(dataBase64, 'base64'), { flag: 'wx' })
      return 'stored'
    },
  }
}

function insideProject(projectRoot: string, directory: string): string {
  const folder = path.resolve(projectRoot, directory)
  if (!folder.startsWith(path.resolve(projectRoot) + path.sep)) throw new Error('The screenshot inbox must be inside the project folder.')
  return folder
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}
