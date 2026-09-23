import { access, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

/** Port: the folder screenshots are dropped into, and the archive they can be moved to after import. */
export interface InboxFolder {
  folderPath: () => string
  store: (fileName: string, dataBase64: string) => Promise<'stored' | 'already-present'>
  read: (fileName: string) => Promise<Buffer>
  modifiedAt: (fileName: string) => Promise<Date>
  remove: (fileName: string) => Promise<void>
  archive: (fileName: string, scanDate: string) => Promise<void>
  archivedFiles: (scanDate: string) => Promise<string[]>
  readArchived: (fileName: string, scanDate: string) => Promise<Buffer>
}

interface InboxLocations {
  projectRoot: string
  inboxDirectory: () => string
  archiveDirectory: () => string
}

/** File-system adapter. Both folders must stay inside the project, whatever the settings say. */
export const inboxFolder = ({ projectRoot, inboxDirectory, archiveDirectory }: InboxLocations): InboxFolder => {
  const inbox = () => insideProject(projectRoot, inboxDirectory())
  const archiveFor = (scanDate: string) => path.join(insideProject(projectRoot, archiveDirectory()), scanDate)

  return {
    folderPath: inbox,
    store: async (fileName, dataBase64) => {
      const target = path.join(inbox(), fileName)
      if (await exists(target)) return 'already-present'
      await mkdir(inbox(), { recursive: true })
      await writeFile(target, Buffer.from(dataBase64, 'base64'), { flag: 'wx' })
      return 'stored'
    },
    read: (fileName) => readFile(path.join(inbox(), fileName)),
    modifiedAt: async (fileName) => (await stat(path.join(inbox(), fileName))).mtime,
    remove: (fileName) => rm(path.join(inbox(), fileName), { force: true }),
    archive: async (fileName, scanDate) => {
      await mkdir(archiveFor(scanDate), { recursive: true })
      await rename(path.join(inbox(), fileName), path.join(archiveFor(scanDate), fileName))
    },
    archivedFiles: async (scanDate) => ((await exists(archiveFor(scanDate))) ? (await readdir(archiveFor(scanDate))).sort() : []),
    readArchived: (fileName, scanDate) => readFile(path.join(archiveFor(scanDate), fileName)),
  }
}

function insideProject(projectRoot: string, directory: string): string {
  const folder = path.resolve(projectRoot, directory)
  if (!folder.startsWith(path.resolve(projectRoot) + path.sep)) throw new Error('Screenshot folders must be inside the project folder.')
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
