import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { defaultSettingsFor } from '../../domain/DefaultSettings.ts'
import type { Observation, Person, Scan } from '../../../shared/domain/Observation.ts'
import { openTrackerDatabase, sqliteTrackerStore } from './SqliteTrackerStore.ts'

function freshDatabaseFile(): string {
  return path.join(mkdtempSync(path.join(tmpdir(), 'tracker-db-')), 'data', 'linkedin.sqlite')
}

const jane: Person = {
  id: 'person-jane',
  personHash: 'hash-jane',
  displayName: 'Jane Smith',
  headline: 'VP Engineering at Acme',
  companyName: 'Acme',
  companyConfidence: 0.9,
  companyExtractionMethod: 'ocr-headline',
}

const scan: Scan = {
  id: 'followers-2026-09-22',
  scanDate: '2026-09-22',
  cardsDetected: 3,
  duplicateCount: 1,
  screenshots: [{ fileName: 'shot-1.png', peopleDetected: 1, uncertainCount: 0, outcome: 'processed', warning: null }],
}

const janeIsOpen: Observation = {
  scanId: scan.id,
  personId: jane.id,
  openToWork: { status: 'OPEN', confidence: 0.97, classificationMethod: 'opencv' },
  hiring: { status: 'NOT_HIRING', confidence: 0.96, classificationMethod: 'opencv' },
}

const janesDay = { scan, people: [jane], observations: [janeIsOpen] }

function followersStore(database: ReturnType<typeof openTrackerDatabase>) {
  return sqliteTrackerStore(database, 'followers', defaultSettingsFor('followers'))
}

describe('SQLite database', () => {
  it('creates the data folder, the file, and its tables on first use', () => {
    const database = openTrackerDatabase(freshDatabaseFile())

    expect(sqliteTrackerStore(database, 'followers', defaultSettingsFor('followers')).readNetwork()).toEqual({ people: [], scans: [], observations: [] })
  })

  it('keeps analyzed scans after the database is closed and opened again', () => {
    const file = freshDatabaseFile()
    const first = openTrackerDatabase(file)
    followersStore(first).saveAnalyzedDay(janesDay)
    first.close()

    const reopened = sqliteTrackerStore(openTrackerDatabase(file), 'followers', defaultSettingsFor('followers')).readNetwork()

    expect(reopened).toEqual({ people: [jane], scans: [scan], observations: [janeIsOpen] })
  })

  it('keeps saved settings after reopening', () => {
    const file = freshDatabaseFile()
    const settings = { ...defaultSettingsFor('followers'), scanFrequency: 'weekly' as const }
    sqliteTrackerStore(openTrackerDatabase(file), 'followers', defaultSettingsFor('followers')).saveSettings(settings)

    expect(sqliteTrackerStore(openTrackerDatabase(file), 'followers', defaultSettingsFor('followers')).readSettings().scanFrequency).toBe('weekly')
  })

  it('keeps followers and contacts apart in the same file', () => {
    const database = openTrackerDatabase(freshDatabaseFile())
    followersStore(database).saveAnalyzedDay(janesDay)

    expect(sqliteTrackerStore(database, 'contacts', defaultSettingsFor('contacts')).readNetwork().people).toEqual([])
  })

  it('does not duplicate anything when the same day is analyzed again', () => {
    const database = openTrackerDatabase(freshDatabaseFile())
    followersStore(database).saveAnalyzedDay(janesDay)
    followersStore(database).saveAnalyzedDay(janesDay)

    expect(sqliteTrackerStore(database, 'followers', defaultSettingsFor('followers')).readNetwork().observations).toHaveLength(1)
  })

  it('counts screenshots waiting in the inbox until they are analyzed', () => {
    const database = openTrackerDatabase(freshDatabaseFile())
    const store = sqliteTrackerStore(database, 'followers', defaultSettingsFor('followers'))
    store.recordWaitingScreenshot('shot-1.png')
    store.recordWaitingScreenshot('shot-2.png')
    followersStore(database).saveAnalyzedDay(janesDay)

    expect(store.waitingScreenshotCount()).toBe(1)
  })

  it('reads back a saved day so later uploads that day can be merged in', () => {
    const database = openTrackerDatabase(freshDatabaseFile())
    followersStore(database).saveAnalyzedDay(janesDay)

    expect(followersStore(database).readDay('2026-09-22')).toEqual(janesDay)
  })

  it('keeps a screenshot that could not be read, marked failed, and no longer waiting', () => {
    const database = openTrackerDatabase(freshDatabaseFile())
    followersStore(database).recordWaitingScreenshot('blurry.png')
    followersStore(database).markScreenshotFailed('blurry.png', 'No people found')

    expect(followersStore(database).waitingScreenshots()).toEqual([])
  })
})
