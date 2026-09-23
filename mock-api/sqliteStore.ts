import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { type Audience, type Settings, settingsSchema } from '../contracts/api.ts'
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
} from './domain/observation.ts'
import type { TrackerStore } from './trackerStore.ts'

/**
 * Schema changes, applied in order. The database remembers how many it has applied (PRAGMA user_version),
 * so opening an older file upgrades it and opening a current one changes nothing.
 */
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
]

export const defaultDatabasePath = 'data/linkedin.sqlite'

/** Opens the database file, creating the folder, the file, and every table on first use. */
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

/** One audience's data in the shared database file. Every read comes straight from SQLite. */
export function sqliteStore(database: DatabaseSync, audience: Audience, defaultSettings: Settings): TrackerStore {
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
    waitingScreenshotCount: () => Number((database.prepare("SELECT COUNT(*) AS count FROM screenshots WHERE audience = ? AND outcome = 'waiting'").get(audience) as { count: number }).count),
  }
}

/** Total rows changed through this connection; bumps the version when this app writes. */
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

/**
 * Writes one analyzed day for an audience in a single transaction: its people, the scan, each person's
 * observation, and which screenshots it came from. Re-saving the same day replaces it, so re-analysis
 * never duplicates anything.
 */
export function saveAnalyzedScan(database: DatabaseSync, audience: Audience, scan: Scan, people: Person[], observations: Observation[]): void {
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

function upsertPerson(database: DatabaseSync, audience: Audience, person: Person): void {
  database
    .prepare(
      `INSERT INTO people (id, audience, person_hash, display_name, headline, company_name, company_confidence, company_extraction_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET display_name = excluded.display_name, headline = excluded.headline, company_name = excluded.company_name,
         company_confidence = excluded.company_confidence, company_extraction_method = excluded.company_extraction_method`,
    )
    .run(person.id, audience, person.personHash, person.displayName, person.headline, person.companyName, person.companyConfidence, person.companyExtractionMethod)
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
