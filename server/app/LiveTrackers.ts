import { existsSync } from 'node:fs'
import path from 'node:path'
import type { Audience, ProcessingResult } from '../../contracts/api.ts'
import { clearAllData } from '../tracker/use-cases/ClearAllData.ts'
import { clearAudienceData } from '../tracker/use-cases/ClearAudienceData.ts'
import { watchInbox } from '../screenshots/jobs/InboxWatcher.ts'
import { type InboxFolder, inboxFolder as inboxFolderAt } from '../screenshots/outbound/filesystem/InboxFolder.ts'
import type { CardReader } from '../screenshots/outbound/vision/CardReader.ts'
import { addScreenshots } from '../screenshots/use-cases/AddScreenshots.ts'
import { analyzeInbox } from '../screenshots/use-cases/AnalyzeInbox.ts'
import { reprocessScan } from '../screenshots/use-cases/ReprocessScan.ts'
import { defaultSettingsFor } from '../tracker/domain/DefaultSettings.ts'
import { defaultDatabasePath, eraseTrackerDatabase, openTrackerDatabase, sqliteTrackerStore } from '../tracker/outbound/persistence/SqliteTrackerStore.ts'
import type { TrackerStore } from '../tracker/outbound/persistence/TrackerStore.ts'
import type { RoutesByAudience } from './AudienceRouting.ts'
import { audienceTrackerRoutes } from './AudienceTracker.ts'

export interface LiveTrackerSetup {
  projectRoot: string
  cardReader: CardReader
  log: (message: string) => void
}

export interface LiveTrackers {
  routesByAudience: RoutesByAudience
  watchInboxes: () => () => Promise<void>
}

export const liveTrackers = ({ projectRoot, cardReader, log }: LiveTrackerSetup): LiveTrackers => {
  const databasePath = path.join(projectRoot, defaultDatabasePath)
  const isNew = !existsSync(databasePath)
  const database = openTrackerDatabase(databasePath)
  log(`Tracker: ${isNew ? 'created' : 'using'} SQLite database ${defaultDatabasePath}`)
  const inboxes: InboxFolder[] = []
  const { clearAllData: clearEverything } = clearAllData({
    eraseDatabase: () => eraseTrackerDatabase(database),
    emptyInboxes: async () => void (await Promise.all(inboxes.map((inbox) => inbox.emptyInbox()))),
  })
  const followers = liveAudience('followers', sqliteTrackerStore(database, 'followers', defaultSettingsFor('followers')), projectRoot, cardReader, clearEverything)
  const contacts = liveAudience('contacts', sqliteTrackerStore(database, 'contacts', defaultSettingsFor('contacts')), projectRoot, cardReader, clearEverything)
  inboxes.push(followers.inboxFolder, contacts.inboxFolder)
  return {
    routesByAudience: { followers: followers.routes, contacts: contacts.routes },
    watchInboxes: () => {
      const stops = [followers, contacts].map((audience) => audience.watch(log))
      return async () => void (await Promise.all(stops.map((stop) => stop())))
    },
  }
}

function liveAudience(audience: Audience, trackerStore: TrackerStore, projectRoot: string, cardReader: CardReader, clearEverything: () => Promise<ProcessingResult>) {
  const inboxFolder = inboxFolderAt({
    projectRoot,
    inboxDirectory: () => trackerStore.readSettings().inboxDirectory,
    archiveDirectory: () => trackerStore.readSettings().archiveDirectory,
  })
  const { analyzeWaitingScreenshots } = analyzeInbox({ audience, trackerStore, inboxFolder, cardReader })
  const routes = audienceTrackerRoutes({
    trackerStore,
    screenshots: {
      ...addScreenshots({ inboxFolder, trackerStore, analyzeWaitingScreenshots }),
      ...reprocessScan({ audience, trackerStore, inboxFolder, cardReader }),
    },
    clearAllData: clearEverything,
    ...clearAudienceData({ audience, trackerStore, emptyInbox: inboxFolder.emptyInbox }),
  })
  const watch = (log: (message: string) => void) =>
    watchInbox({
      folderPath: inboxFolder.folderPath(),
      onScreenshotFound: (fileName) => {
        if (trackerStore.knowsScreenshot(fileName) || !trackerStore.readSettings().automaticProcessing) return
        trackerStore.recordWaitingScreenshot(fileName)
        void analyzeWaitingScreenshots().then((report) => log(`Tracker (${audience}): imported ${report.importedFiles.length}, failed ${report.failedFiles.length}`))
      },
      onFileSkipped: (fileName, reason) => log(`Tracker (${audience}): skipped ${fileName}: ${reason}`),
    })
  return { routes, watch, inboxFolder }
}
