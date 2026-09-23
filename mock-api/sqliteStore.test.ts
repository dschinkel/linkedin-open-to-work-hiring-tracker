import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { defaultSettingsFor } from './defaultSettings.ts'
import type { Observation, Person, Scan } from './domain/observation.ts'
import { openTrackerDatabase, saveAnalyzedScan, sqliteStore } from './sqliteStore.ts'
import { createTrackerApi } from './trackerApi.ts'

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

describe('SQLite database', () => {
  it('creates the data folder, the file, and its tables on first use', () => {
    const database = openTrackerDatabase(freshDatabaseFile())

    expect(sqliteStore(database, 'followers', defaultSettingsFor('followers')).readNetwork()).toEqual({ people: [], scans: [], observations: [] })
  })

  it('keeps analyzed scans after the database is closed and opened again', () => {
    const file = freshDatabaseFile()
    const first = openTrackerDatabase(file)
    saveAnalyzedScan(first, 'followers', scan, [jane], [janeIsOpen])
    first.close()

    const reopened = sqliteStore(openTrackerDatabase(file), 'followers', defaultSettingsFor('followers')).readNetwork()

    expect(reopened).toEqual({ people: [jane], scans: [scan], observations: [janeIsOpen] })
  })

  it('keeps saved settings after reopening', () => {
    const file = freshDatabaseFile()
    const settings = { ...defaultSettingsFor('followers'), scanFrequency: 'weekly' as const }
    sqliteStore(openTrackerDatabase(file), 'followers', defaultSettingsFor('followers')).saveSettings(settings)

    expect(sqliteStore(openTrackerDatabase(file), 'followers', defaultSettingsFor('followers')).readSettings().scanFrequency).toBe('weekly')
  })

  it('keeps followers and contacts apart in the same file', () => {
    const database = openTrackerDatabase(freshDatabaseFile())
    saveAnalyzedScan(database, 'followers', scan, [jane], [janeIsOpen])

    expect(sqliteStore(database, 'contacts', defaultSettingsFor('contacts')).readNetwork().people).toEqual([])
  })

  it('does not duplicate anything when the same day is analyzed again', () => {
    const database = openTrackerDatabase(freshDatabaseFile())
    saveAnalyzedScan(database, 'followers', scan, [jane], [janeIsOpen])
    saveAnalyzedScan(database, 'followers', scan, [jane], [janeIsOpen])

    expect(sqliteStore(database, 'followers', defaultSettingsFor('followers')).readNetwork().observations).toHaveLength(1)
  })

  it('counts screenshots waiting in the inbox until they are analyzed', () => {
    const database = openTrackerDatabase(freshDatabaseFile())
    const store = sqliteStore(database, 'followers', defaultSettingsFor('followers'))
    store.recordWaitingScreenshot('shot-1.png')
    store.recordWaitingScreenshot('shot-2.png')
    saveAnalyzedScan(database, 'followers', scan, [jane], [janeIsOpen])

    expect(store.waitingScreenshotCount()).toBe(1)
  })

  it('serves dashboards straight from the database, updating after each new scan', () => {
    const database = openTrackerDatabase(freshDatabaseFile())
    const api = createTrackerApi(sqliteStore(database, 'followers', defaultSettingsFor('followers')), {})
    const before = api.dashboard().scanCount
    saveAnalyzedScan(database, 'followers', scan, [jane], [janeIsOpen])

    expect([before, api.dashboard().scanCount, api.dashboard().latestScan?.openToWork.open]).toEqual([0, 1, 1])
  })
})
