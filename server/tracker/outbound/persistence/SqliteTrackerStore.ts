import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { type Audience, type AudienceChoice, type Settings, type Snapshot, type SnapshotKind, type SnapshotSummary, settingsSchema, snapshotSchema } from '../../../../contracts/api.ts'
import type {
  ClassificationMethod,
  CompanyExtractionMethod,
  HiringStatus,
  Network,
  Observation,
  OpenToWorkStatus,
  Person,
  Scan,
  Screenshot,
} from '../../../shared/domain/Observation.ts'
import type { AnalyzedDay, SnapshotStore, TrackerStore, WaitingScreenshot } from './TrackerStore.ts'

const migrations: string[] = [
  `CREATE TABLE people (
     id TEXT PRIMARY KEY,
     audience TEXT NOT NULL,
     person_hash TEXT NOT NULL,
     display_name TEXT NOT NULL,
     headline TEXT,
     company_name TEXT,
     company_confidence REAL,
     company_extraction_method TEXT NOT NULL DEFAULT 'unknown',
     UNIQUE (audience, person_hash)
   );
   CREATE TABLE scans (
     id TEXT PRIMARY KEY,
     audience TEXT NOT NULL,
     scan_date TEXT NOT NULL,
     cards_detected INTEGER NOT NULL DEFAULT 0,
     duplicate_count INTEGER NOT NULL DEFAULT 0,
     UNIQUE (audience, scan_date)
   );
   CREATE TABLE observations (
     scan_id TEXT NOT NULL REFERENCES scans (id) ON DELETE CASCADE,
     person_id TEXT NOT NULL REFERENCES people (id),
     open_status TEXT NOT NULL,
     open_confidence REAL NOT NULL,
     open_classification_method TEXT NOT NULL,
     hiring_status TEXT NOT NULL,
     hiring_confidence REAL NOT NULL,
     hiring_classification_method TEXT NOT NULL,
     PRIMARY KEY (scan_id, person_id)
   );
   CREATE TABLE screenshots (
     audience TEXT NOT NULL,
     file_name TEXT NOT NULL,
     added_at TEXT NOT NULL,
     scan_id TEXT REFERENCES scans (id) ON DELETE SET NULL,
     outcome TEXT NOT NULL DEFAULT 'waiting',
     people_detected INTEGER NOT NULL DEFAULT 0,
     uncertain_count INTEGER NOT NULL DEFAULT 0,
     warning TEXT,
     PRIMARY KEY (audience, file_name)
   );
   CREATE TABLE settings (
     audience TEXT PRIMARY KEY,
     json TEXT NOT NULL
   );`,
  `ALTER TABLE people ADD COLUMN photo_print TEXT`,
  `CREATE TABLE snapshots (
     id TEXT PRIMARY KEY,
     audience TEXT NOT NULL,
     kind TEXT NOT NULL,
     name TEXT NOT NULL,
     created_at TEXT NOT NULL,
     people_count INTEGER NOT NULL,
     filters_json TEXT,
     people_json TEXT NOT NULL
   );
   CREATE INDEX snapshots_by_list ON snapshots (audience, kind, created_at)`,
]

export const defaultDatabasePath = 'data/linkedin.sqlite'

export function openTrackerDatabase(databasePath: string): DatabaseSync {
  if (databasePath !== ':memory:') mkdirSync(path.dirname(databasePath), { recursive: true })
  const database = new DatabaseSync(databasePath)
  database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;')
  applyMigrations(database)
  return database
}

function applyMigrations(database: DatabaseSync): void {
  const applied = Number((database.prepare('PRAGMA user_version').get() as { user_version: number }).user_version)
  migrations.slice(applied).forEach((migration, offset) => {
    database.exec(`BEGIN; ${migration}; PRAGMA user_version = ${applied + offset + 1}; COMMIT;`)
  })
}

export const sqliteTrackerStore = (database: DatabaseSync, audience: Audience, defaultSettings: Settings): TrackerStore => {
  return {
    readNetwork: () => readNetwork(database, audience),
    dataVersion: () => Number((database.prepare('PRAGMA data_version').get() as { data_version: number }).data_version) + changeCount(database),
    readSettings: () => readSettings(database, audience) ?? defaultSettings,
    saveSettings: (settings) => {
      database.prepare('INSERT INTO settings (audience, json) VALUES (?, ?) ON CONFLICT (audience) DO UPDATE SET json = excluded.json').run(audience, JSON.stringify(settings))
    },
    recordWaitingScreenshot: (fileName) => {
      database.prepare('INSERT OR IGNORE INTO screenshots (audience, file_name, added_at) VALUES (?, ?, ?)').run(audience, fileName, new Date().toISOString())
    },
    waitingScreenshots: () =>
      database
        .prepare("SELECT file_name AS fileName, added_at AS addedAt FROM screenshots WHERE audience = ? AND outcome = 'waiting' ORDER BY file_name")
        .all(audience) as unknown as WaitingScreenshot[],
    knowsScreenshot: (fileName) => database.prepare('SELECT 1 FROM screenshots WHERE audience = ? AND file_name = ?').get(audience, fileName) !== undefined,
    waitingScreenshotCount: () => Number((database.prepare("SELECT COUNT(*) AS count FROM screenshots WHERE audience = ? AND outcome = 'waiting'").get(audience) as { count: number }).count),
    readDay: (scanDate) => readDay(database, audience, scanDate),
    readScan: (scanId) => readScan(database, audience, scanId),
    saveAnalyzedDay: ({ scan, people, observations }) => saveAnalyzedScan(database, audience, scan, people, observations),
    markScreenshotFailed: (fileName, reason) => {
      database
        .prepare("UPDATE screenshots SET outcome = 'failed', warning = ? WHERE audience = ? AND file_name = ?")
        .run(reason, audience, fileName)
    },
    ...sqliteSnapshotStore(database, audience),
    eraseAudience: () => eraseAudience(database, audience),
  }
}

export const sqliteSnapshotStore = (database: DatabaseSync, owner: AudienceChoice): SnapshotStore => ({
  saveSnapshot: (snapshot) => saveSnapshot(database, owner, snapshot),
  listSnapshots: (kind) => listSnapshots(database, owner, kind),
  readSnapshot: (snapshotId) => readSnapshot(database, owner, snapshotId),
  deleteSnapshot: (snapshotId) => Number(database.prepare('DELETE FROM snapshots WHERE audience = ? AND id = ?').run(owner, snapshotId).changes) > 0,
})

export function eraseTrackerDatabase(database: DatabaseSync): void {
  database.exec('BEGIN; DELETE FROM observations; DELETE FROM screenshots; DELETE FROM scans; DELETE FROM people; DELETE FROM settings; DELETE FROM snapshots; COMMIT;')
}

const audienceErasures = [
  'DELETE FROM observations WHERE scan_id IN (SELECT id FROM scans WHERE audience = :audience) OR person_id IN (SELECT id FROM people WHERE audience = :audience)',
  'DELETE FROM screenshots WHERE audience = :audience',
  'DELETE FROM scans WHERE audience = :audience',
  'DELETE FROM people WHERE audience = :audience',
  'DELETE FROM settings WHERE audience = :audience',
  'DELETE FROM snapshots WHERE audience = :audience',
]

function eraseAudience(database: DatabaseSync, audience: Audience): void {
  database.exec('BEGIN')
  try {
    for (const erasure of audienceErasures) database.prepare(erasure).run({ audience })
    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}

function readDay(database: DatabaseSync, audience: Audience, scanDate: string): AnalyzedDay | null {
  const network = readNetwork(database, audience)
  const scan = network.scans.find((existing) => existing.scanDate === scanDate)
  if (!scan) return null
  const observations = network.observations.filter((observation) => observation.scanId === scan.id)
  const personIds = new Set(observations.map((observation) => observation.personId))
  return { scan, observations, people: network.people.filter((person) => personIds.has(person.id)) }
}

function readScan(database: DatabaseSync, audience: Audience, scanId: string): AnalyzedDay | null {
  const scan = readScans(database, audience).find((existing) => existing.id === scanId)
  if (!scan) return null
  return {
    scan,
    observations: database
      .prepare('SELECT * FROM observations WHERE scan_id = ?')
      .all(scanId)
      .map((row) => toObservation(row as unknown as ObservationRow)),
    people: database
      .prepare('SELECT people.* FROM people JOIN observations ON observations.person_id = people.id WHERE observations.scan_id = ? AND people.audience = ?')
      .all(scanId, audience)
      .map((row) => toPerson(row as unknown as PersonRow)),
  }
}

function changeCount(database: DatabaseSync): number {
  return Number((database.prepare('SELECT total_changes() AS changes').get() as { changes: number }).changes)
}

function readSettings(database: DatabaseSync, audience: Audience): Settings | null {
  const row = database.prepare('SELECT json FROM settings WHERE audience = ?').get(audience) as { json: string } | undefined
  return row ? settingsSchema.parse(JSON.parse(row.json)) : null
}

function readNetwork(database: DatabaseSync, audience: Audience): Network {
  return {
    people: database.prepare('SELECT * FROM people WHERE audience = ?').all(audience).map((row) => toPerson(row as unknown as PersonRow)),
    scans: readScans(database, audience),
    observations: database
      .prepare('SELECT observations.* FROM observations JOIN scans ON scans.id = observations.scan_id WHERE scans.audience = ?')
      .all(audience)
      .map((row) => toObservation(row as unknown as ObservationRow)),
  }
}

function readScans(database: DatabaseSync, audience: Audience): Scan[] {
  const screenshotsByScan = new Map<string, Screenshot[]>()
  for (const row of database.prepare("SELECT * FROM screenshots WHERE audience = ? AND scan_id IS NOT NULL ORDER BY file_name").all(audience) as unknown as ScreenshotRow[]) {
    screenshotsByScan.set(row.scan_id as string, [...(screenshotsByScan.get(row.scan_id as string) ?? []), toScreenshot(row)])
  }
  return (database.prepare('SELECT * FROM scans WHERE audience = ? ORDER BY scan_date').all(audience) as unknown as ScanRow[]).map((row) => ({
    id: row.id,
    scanDate: row.scan_date,
    cardsDetected: row.cards_detected,
    duplicateCount: row.duplicate_count,
    screenshots: screenshotsByScan.get(row.id) ?? [],
  }))
}

function saveAnalyzedScan(database: DatabaseSync, audience: Audience, scan: Scan, people: Person[], observations: Observation[]): void {
  database.exec('BEGIN')
  try {
    for (const person of people) upsertPerson(database, audience, person)
    database.prepare('DELETE FROM scans WHERE audience = ? AND scan_date = ?').run(audience, scan.scanDate)
    database.prepare('INSERT INTO scans (id, audience, scan_date, cards_detected, duplicate_count) VALUES (?, ?, ?, ?, ?)').run(scan.id, audience, scan.scanDate, scan.cardsDetected, scan.duplicateCount)
    for (const observation of observations) insertObservation(database, observation)
    for (const screenshot of scan.screenshots) markScreenshotAnalyzed(database, audience, scan.id, screenshot)
    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}

function saveSnapshot(database: DatabaseSync, audience: AudienceChoice, snapshot: Snapshot): void {
  database
    .prepare('INSERT INTO snapshots (id, audience, kind, name, created_at, people_count, filters_json, people_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(snapshot.id, audience, snapshot.kind, snapshot.name, snapshot.createdAt, snapshot.peopleCount, snapshot.kind === 'hiring' ? JSON.stringify(snapshot.filters) : null, JSON.stringify(snapshot.people))
}

function listSnapshots(database: DatabaseSync, audience: AudienceChoice, kind: SnapshotKind): SnapshotSummary[] {
  return database
    .prepare('SELECT id, kind, name, created_at AS createdAt, people_count AS peopleCount FROM snapshots WHERE audience = ? AND kind = ? ORDER BY created_at DESC')
    .all(audience, kind)
    .map((row) => ({ ...(row as unknown as SnapshotSummary) }))
}

function readSnapshot(database: DatabaseSync, audience: AudienceChoice, snapshotId: string): Snapshot | null {
  const row = database.prepare('SELECT * FROM snapshots WHERE audience = ? AND id = ?').get(audience, snapshotId) as unknown as SnapshotRow | undefined
  if (!row) return null
  return snapshotSchema.parse({
    id: row.id,
    kind: row.kind,
    name: row.name,
    createdAt: row.created_at,
    peopleCount: row.people_count,
    ...(row.filters_json ? { filters: JSON.parse(row.filters_json) } : {}),
    people: JSON.parse(row.people_json),
  })
}

function upsertPerson(database: DatabaseSync, audience: Audience, person: Person): void {
  database
    .prepare(
      `INSERT INTO people (id, audience, person_hash, display_name, headline, company_name, company_confidence, company_extraction_method, photo_print)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET display_name = excluded.display_name, headline = excluded.headline, company_name = excluded.company_name,
         company_confidence = excluded.company_confidence, company_extraction_method = excluded.company_extraction_method,
         photo_print = COALESCE(excluded.photo_print, people.photo_print)`,
    )
    .run(person.id, audience, person.personHash, person.displayName, person.headline, person.companyName, person.companyConfidence, person.companyExtractionMethod, person.photoPrint ?? null)
}

function insertObservation(database: DatabaseSync, observation: Observation): void {
  database
    .prepare(
      `INSERT INTO observations (scan_id, person_id, open_status, open_confidence, open_classification_method, hiring_status, hiring_confidence, hiring_classification_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      observation.scanId,
      observation.personId,
      observation.openToWork.status,
      observation.openToWork.confidence,
      observation.openToWork.classificationMethod,
      observation.hiring.status,
      observation.hiring.confidence,
      observation.hiring.classificationMethod,
    )
}

function markScreenshotAnalyzed(database: DatabaseSync, audience: Audience, scanId: string, screenshot: Screenshot): void {
  database
    .prepare(
      `INSERT INTO screenshots (audience, file_name, added_at, scan_id, outcome, people_detected, uncertain_count, warning)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (audience, file_name) DO UPDATE SET scan_id = excluded.scan_id, outcome = excluded.outcome,
         people_detected = excluded.people_detected, uncertain_count = excluded.uncertain_count, warning = excluded.warning`,
    )
    .run(audience, screenshot.fileName, new Date().toISOString(), scanId, screenshot.outcome, screenshot.peopleDetected, screenshot.uncertainCount, screenshot.warning)
}

interface PersonRow {
  id: string
  person_hash: string
  display_name: string
  headline: string | null
  company_name: string | null
  company_confidence: number | null
  company_extraction_method: string
  photo_print: string | null
}

interface ScanRow {
  id: string
  scan_date: string
  cards_detected: number
  duplicate_count: number
}

interface ObservationRow {
  scan_id: string
  person_id: string
  open_status: string
  open_confidence: number
  open_classification_method: string
  hiring_status: string
  hiring_confidence: number
  hiring_classification_method: string
}

interface SnapshotRow {
  id: string
  kind: string
  name: string
  created_at: string
  people_count: number
  filters_json: string | null
  people_json: string
}

interface ScreenshotRow {
  file_name: string
  scan_id: string | null
  outcome: string
  people_detected: number
  uncertain_count: number
  warning: string | null
}

function toPerson(row: PersonRow): Person {
  return {
    id: row.id,
    personHash: row.person_hash,
    displayName: row.display_name,
    headline: row.headline,
    companyName: row.company_name,
    companyConfidence: row.company_confidence,
    companyExtractionMethod: row.company_extraction_method as CompanyExtractionMethod,
    ...(row.photo_print ? { photoPrint: row.photo_print } : {}),
  }
}

function toObservation(row: ObservationRow): Observation {
  return {
    scanId: row.scan_id,
    personId: row.person_id,
    openToWork: { status: row.open_status as OpenToWorkStatus, confidence: row.open_confidence, classificationMethod: row.open_classification_method as ClassificationMethod },
    hiring: { status: row.hiring_status as HiringStatus, confidence: row.hiring_confidence, classificationMethod: row.hiring_classification_method as ClassificationMethod },
  }
}

function toScreenshot(row: ScreenshotRow): Screenshot {
  return {
    fileName: row.file_name,
    peopleDetected: row.people_detected,
    uncertainCount: row.uncertain_count,
    outcome: row.outcome as Screenshot['outcome'],
    warning: row.warning,
  }
}
