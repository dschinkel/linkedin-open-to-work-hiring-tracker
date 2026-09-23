import { defaultSettingsFor } from '../../tracker/domain/DefaultSettings.ts'
import { memoryTrackerStore } from '../../tracker/outbound/persistence/MemoryTrackerStore.ts'
import type { InboxFolder } from '../outbound/filesystem/InboxFolder.ts'
import type { AnalysisReport } from './AnalyzeInbox.ts'
import { addScreenshots } from './AddScreenshots.ts'

function inboxHolding(existing: string[]): InboxFolder & { stored: string[] } {
  const stored: string[] = []
  const unused = () => Promise.reject(new Error('not used here'))
  return {
    stored,
    folderPath: () => '/inbox',
    store: async (fileName) => {
      if (existing.includes(fileName)) return 'already-present'
      stored.push(fileName)
      return 'stored'
    },
    read: unused,
    modifiedAt: unused,
    remove: unused,
    archive: unused,
    archivedFiles: async () => [],
    readArchived: unused,
    emptyInbox: async () => undefined,
  }
}

const nothingImported: AnalysisReport = { importedFiles: [], failedFiles: [], peopleFound: 0 }
const tenPeopleImported: AnalysisReport = { importedFiles: ['shot.png'], failedFiles: [], peopleFound: 10 }
const emptyStore = () => memoryTrackerStore({ people: [], scans: [], observations: [] }, defaultSettingsFor('followers'))
const png = (fileName: string) => ({ fileName, dataBase64: 'aGk=' })

describe('adding dropped screenshots', () => {
  it('stores image files in the inbox and records them as waiting', async () => {
    const inbox = inboxHolding([])
    const trackerStore = emptyStore()

    await addScreenshots({ inboxFolder: inbox, trackerStore, analyzeWaitingScreenshots: async () => nothingImported }).addScreenshots({ files: [png('shot.png')] })

    expect([inbox.stored, trackerStore.waitingScreenshotCount()]).toEqual([['shot.png'], 1])
  })

  it('analyzes straight away and reports how many people were saved', async () => {
    const add = addScreenshots({ inboxFolder: inboxHolding([]), trackerStore: emptyStore(), analyzeWaitingScreenshots: async () => tenPeopleImported })

    expect((await add.addScreenshots({ files: [png('shot.png')] })).analysisMessage).toContain('10 people saved')
  })

  it('skips a screenshot that was already imported before', async () => {
    const trackerStore = emptyStore()
    trackerStore.recordWaitingScreenshot('shot.png')

    const result = await addScreenshots({ inboxFolder: inboxHolding([]), trackerStore, analyzeWaitingScreenshots: async () => nothingImported }).addScreenshots({ files: [png('shot.png')] })

    expect(result.rejected).toEqual([{ fileName: 'shot.png', reason: 'Already imported' }])
  })

  it('refuses files that are not images', async () => {
    const inbox = inboxHolding([])

    await addScreenshots({ inboxFolder: inbox, trackerStore: emptyStore(), analyzeWaitingScreenshots: async () => nothingImported }).addScreenshots({ files: [png('resume.pdf')] })

    expect(inbox.stored).toEqual([])
  })
})
