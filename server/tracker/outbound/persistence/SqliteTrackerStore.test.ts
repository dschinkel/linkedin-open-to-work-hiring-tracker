import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { HiringSnapshot, OpenToWorkSnapshot } from '../../../../contracts/api.ts'
import { defaultSettingsFor } from '../../domain/DefaultSettings.ts'
import type { Observation, Person, Scan } from '../../../shared/domain/Observation.ts'
import { eraseTrackerDatabase, openTrackerDatabase, sqliteTrackerStore } from './SqliteTrackerStore.ts'

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

const janeOpenSnapshot: OpenToWorkSnapshot = {
  id: 'snapshot-1',
  kind: 'open-to-work',
  name: 'Before the layoffs',
  createdAt: '2026-09-23T10:00:00.000Z',
  peopleCount: 1,
  people: [
    { personId: jane.id, displayName: 'Jane Smith', headline: 'VP Engineering at Acme', companyName: 'Acme', firstSeenOpen: '2026-09-01', lastSeenOpen: '2026-09-22', openSince: '2026-09-01', daysOpen: 22, scansSeenOpen: 4, wasObservedInLatestScan: false },
  ],
}

const janeHiringSnapshot: HiringSnapshot = {
  id: 'snapshot-2',
  kind: 'hiring',
  name: 'Sep 24, 2026 · 0 people',
  createdAt: '2026-09-24T10:00:00.000Z',
  peopleCount: 0,
  filters: { search: 'jane', company: 'Acme', status: 'previous', companyKnown: 'known', sort: 'name' },
  people: [],
}

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

  it("remembers a person's photo, to tell them from others with the same name", () => {
    const file = freshDatabaseFile()
    followersStore(openTrackerDatabase(file)).saveAnalyzedDay({ ...janesDay, people: [{ ...jane, photoPrint: 'c89659' }] })

    expect(followersStore(openTrackerDatabase(file)).readNetwork().people[0].photoPrint).toBe('c89659')
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

  it('reads back one scan with only the people seen in it', () => {
    const database = openTrackerDatabase(freshDatabaseFile())
    const bob: Person = { ...jane, id: 'person-bob', personHash: 'hash-bob', displayName: 'Bob Lee' }
    const nextScan: Scan = { ...scan, id: 'followers-2026-09-23', scanDate: '2026-09-23', screenshots: [] }
    followersStore(database).saveAnalyzedDay(janesDay)
    followersStore(database).saveAnalyzedDay({ scan: nextScan, people: [bob], observations: [{ ...janeIsOpen, scanId: nextScan.id, personId: bob.id }] })

    expect(followersStore(database).readScan(scan.id)).toEqual(janesDay)
  })

  it("does not read another audience's scan", () => {
    const database = openTrackerDatabase(freshDatabaseFile())
    followersStore(database).saveAnalyzedDay(janesDay)

    expect(sqliteTrackerStore(database, 'contacts', defaultSettingsFor('contacts')).readScan(scan.id)).toBeNull()
  })

  it('keeps a screenshot that could not be read, marked failed, and no longer waiting', () => {
    const database = openTrackerDatabase(freshDatabaseFile())
    followersStore(database).recordWaitingScreenshot('blurry.png')
    followersStore(database).markScreenshotFailed('blurry.png', 'No people found')

    expect(followersStore(database).waitingScreenshots()).toEqual([])
  })
})

describe('saved snapshots in SQLite', () => {
  it('reads back a snapshot with its people exactly as saved, after reopening', () => {
    const file = freshDatabaseFile()
    followersStore(openTrackerDatabase(file)).saveSnapshot(janeOpenSnapshot)
    expect(followersStore(openTrackerDatabase(file)).readSnapshot('snapshot-1')).toEqual(janeOpenSnapshot)
  })

  it('reads back the hiring filters a snapshot was taken with', () => {
    const database = openTrackerDatabase(freshDatabaseFile())
    followersStore(database).saveSnapshot(janeHiringSnapshot)
    expect(followersStore(database).readSnapshot('snapshot-2')).toEqual(janeHiringSnapshot)
  })

  it("lists one list's snapshots, newest first, without their people", () => {
    const database = openTrackerDatabase(freshDatabaseFile())
    const later = { ...janeOpenSnapshot, id: 'snapshot-3', name: 'Later', createdAt: '2026-09-25T09:00:00.000Z' }
    followersStore(database).saveSnapshot(janeOpenSnapshot)
    followersStore(database).saveSnapshot(janeHiringSnapshot)
    followersStore(database).saveSnapshot(later)

    expect(followersStore(database).listSnapshots('open-to-work')).toEqual([
      { id: 'snapshot-3', kind: 'open-to-work', name: 'Later', createdAt: '2026-09-25T09:00:00.000Z', peopleCount: 1 },
      { id: 'snapshot-1', kind: 'open-to-work', name: 'Before the layoffs', createdAt: '2026-09-23T10:00:00.000Z', peopleCount: 1 },
    ])
  })

  it("keeps each audience's snapshots apart", () => {
    const database = openTrackerDatabase(freshDatabaseFile())
    followersStore(database).saveSnapshot(janeOpenSnapshot)
    expect([sqliteTrackerStore(database, 'contacts', defaultSettingsFor('contacts')).listSnapshots('open-to-work'), sqliteTrackerStore(database, 'contacts', defaultSettingsFor('contacts')).readSnapshot('snapshot-1')]).toEqual([[], null])
  })

  it('deletes a snapshot, and says whether there was one to delete', () => {
    const database = openTrackerDatabase(freshDatabaseFile())
    followersStore(database).saveSnapshot(janeOpenSnapshot)

    const deletions = [followersStore(database).deleteSnapshot('snapshot-1'), followersStore(database).deleteSnapshot('snapshot-1')]

    expect([deletions, followersStore(database).readSnapshot('snapshot-1')]).toEqual([[true, false], null])
  })

  it("does not delete another audience's snapshot", () => {
    const database = openTrackerDatabase(freshDatabaseFile())
    followersStore(database).saveSnapshot(janeOpenSnapshot)
    sqliteTrackerStore(database, 'contacts', defaultSettingsFor('contacts')).deleteSnapshot('snapshot-1')
    expect(followersStore(database).readSnapshot('snapshot-1')).toEqual(janeOpenSnapshot)
  })

  it('erases snapshots along with everything else when all data is cleared', () => {
    const database = openTrackerDatabase(freshDatabaseFile())
    followersStore(database).saveSnapshot(janeOpenSnapshot)
    eraseTrackerDatabase(database)
    expect(followersStore(database).listSnapshots('open-to-work')).toEqual([])
  })
})
