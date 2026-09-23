import type { Audience, Settings } from '../../../contracts/api.ts'
import { extractCompany } from '../../shared/domain/Company.ts'
import { normalizeIdentity } from '../../shared/domain/IdentityText.ts'
import type { Classification, Observation, Person, Scan, Screenshot } from '../../shared/domain/Observation.ts'
import { parseScanDate } from '../../shared/domain/ScanDate.ts'
import type { AnalyzedDay, TrackerStore } from '../../tracker/outbound/persistence/TrackerStore.ts'
import { bestReading, type DetectedCard, deduplicateCards, type UniquePerson } from '../domain/Deduplication.ts'
import { personHash } from '../domain/Identity.ts'
import type { InboxFolder } from '../outbound/filesystem/InboxFolder.ts'
import type { CardReader } from '../outbound/vision/CardReader.ts'

export interface AnalysisReport {
  importedFiles: string[]
  failedFiles: Array<{ fileName: string; reason: string }>
  peopleFound: number
}

interface AnalyzeInboxPorts {
  audience: Audience
  trackerStore: TrackerStore
  inboxFolder: InboxFolder
  cardReader: CardReader
}

interface ScreenshotReading {
  fileName: string
  cards: DetectedCard[]
  failure: string | null
}

/**
 * Turns every waiting screenshot into saved people and observations: grouped by capture date into one
 * scan per day, merged with anything already saved that day, de-duplicated, then each imported file is
 * deleted (or archived when Settings say keep). A screenshot that can't be read stays, marked failed.
 * Runs one at a time, so a burst of uploads never analyzes the same file twice.
 */
export const analyzeInbox = (ports: AnalyzeInboxPorts) => {
  let queue: Promise<unknown> = Promise.resolve()

  const analyzeWaitingScreenshots = (): Promise<AnalysisReport> => {
    const run = queue.then(() => analyzeAll(ports))
    queue = run.catch(() => undefined)
    return run
  }

  return { analyzeWaitingScreenshots }
}

async function analyzeAll(ports: AnalyzeInboxPorts): Promise<AnalysisReport> {
  const report: AnalysisReport = { importedFiles: [], failedFiles: [], peopleFound: 0 }
  const byDate = await groupWaitingByDate(ports)
  for (const [scanDate, fileNames] of byDate) await analyzeDay(ports, scanDate, fileNames, report)
  return report
}

async function groupWaitingByDate({ trackerStore, inboxFolder }: AnalyzeInboxPorts): Promise<Map<string, string[]>> {
  const byDate = new Map<string, string[]>()
  for (const { fileName } of trackerStore.waitingScreenshots()) {
    const scanDate = parseScanDate(fileName, await modifiedAtOrNow(inboxFolder, fileName))
    byDate.set(scanDate, [...(byDate.get(scanDate) ?? []), fileName])
  }
  return byDate
}

async function modifiedAtOrNow(inboxFolder: InboxFolder, fileName: string): Promise<Date> {
  try {
    return await inboxFolder.modifiedAt(fileName)
  } catch {
    return new Date()
  }
}

async function analyzeDay(ports: AnalyzeInboxPorts, scanDate: string, fileNames: string[], report: AnalysisReport): Promise<void> {
  const readings = await Promise.all(fileNames.map((fileName) => readScreenshot(ports, fileName)))
  const readable = readings.filter((reading) => reading.failure === null)
  for (const failed of readings.filter((reading) => reading.failure !== null)) {
    ports.trackerStore.markScreenshotFailed(failed.fileName, failed.failure as string)
    report.failedFiles.push({ fileName: failed.fileName, reason: failed.failure as string })
  }
  if (readable.length === 0) return
  const day = applyThresholds(mergeIntoDay(ports.audience, scanDate, readable, ports.trackerStore.readDay(scanDate)), ports.trackerStore.readSettings())
  ports.trackerStore.saveAnalyzedDay(day)
  await clearImportedFiles(ports, scanDate, readable)
  report.importedFiles.push(...readable.map((reading) => reading.fileName))
  report.peopleFound += day.people.length
}

async function readScreenshot({ inboxFolder, cardReader }: AnalyzeInboxPorts, fileName: string): Promise<ScreenshotReading> {
  try {
    const cards = await cardReader.readCards(await inboxFolder.read(fileName), fileName)
    return { fileName, cards, failure: cards.length === 0 ? 'No LinkedIn people found in this screenshot' : null }
  } catch {
    return { fileName, cards: [], failure: 'This image could not be read' }
  }
}

async function clearImportedFiles({ inboxFolder, trackerStore }: AnalyzeInboxPorts, scanDate: string, readings: ScreenshotReading[]): Promise<void> {
  const keep = trackerStore.readSettings().afterAnalysis === 'keep'
  for (const { fileName } of readings) await (keep ? inboxFolder.archive(fileName, scanDate) : inboxFolder.remove(fileName))
}

/**
 * Settings decide how sure a reading must be: a frame counts only when its confidence reaches the "match above"
 * threshold, and "no frame" only when it reaches 1 − "no match below". Anything less sure becomes Uncertain.
 */
export function applyThresholds(day: AnalyzedDay, settings: Settings): AnalyzedDay {
  const open = { present: settings.openToWorkThresholds.open, absent: 1 - settings.openToWorkThresholds.notOpen }
  const hiring = { present: settings.hiringThresholds.hiring, absent: 1 - settings.hiringThresholds.notHiring }
  return {
    ...day,
    observations: day.observations.map((observation) => ({
      ...observation,
      openToWork: withinThreshold(observation.openToWork, 'OPEN', open),
      hiring: withinThreshold(observation.hiring, 'HIRING', hiring),
    })),
  }
}

function withinThreshold<Status extends string>(reading: Classification<Status>, present: string, thresholds: { present: number; absent: number }): Classification<Status> {
  if (reading.status === 'UNCERTAIN') return reading
  const required = reading.status === present ? thresholds.present : thresholds.absent
  return reading.confidence >= required ? reading : { ...reading, status: 'UNCERTAIN' as Status }
}

/** New cards join what was already saved for the day; someone seen again keeps the clearest reading. */
export function mergeIntoDay(audience: Audience, scanDate: string, readings: ScreenshotReading[], existing: AnalyzedDay | null): AnalyzedDay {
  const scanId = `${audience}-${scanDate}`
  const cards = readings.flatMap((reading) => reading.cards)
  const deduplicated = deduplicateCards(cards, normalizeIdentity)
  const newPeople = deduplicated.people.map((unique) => toPerson(audience, unique))
  const observations = mergeObservations(existing?.observations ?? [], deduplicated.people.map((unique, position) => toObservation(scanId, newPeople[position].id, unique)), scanId)
  const people = mergePeople(existing?.people ?? [], newPeople)
  const alreadySeenToday = newPeople.filter((person) => existing?.people.some((earlier) => earlier.id === person.id)).length
  const scan: Scan = {
    id: scanId,
    scanDate,
    cardsDetected: (existing?.scan.cardsDetected ?? 0) + cards.length,
    duplicateCount: (existing?.scan.duplicateCount ?? 0) + deduplicated.duplicateCount + alreadySeenToday,
    screenshots: [...(existing?.scan.screenshots ?? []), ...readings.map(toScreenshotResult)],
  }
  return { scan, people, observations }
}

function toPerson(audience: Audience, unique: UniquePerson): Person {
  const { displayName, headline, companyName } = unique.card
  const hash = personHash({ displayName, headline, companyName })
  return { id: `${audience}-${hash.slice(0, 20)}`, personHash: hash, displayName, headline, ...extractCompany(headline, companyName) }
}

function toObservation(scanId: string, personId: string, unique: UniquePerson): Observation {
  return { scanId, personId, openToWork: unique.openToWork, hiring: unique.hiring }
}

function mergeObservations(earlier: Observation[], latest: Observation[], scanId: string): Observation[] {
  const byPerson = new Map(earlier.map((observation) => [observation.personId, { ...observation, scanId }]))
  for (const observation of latest) byPerson.set(observation.personId, combineReadings(byPerson.get(observation.personId), observation))
  return [...byPerson.values()]
}

function combineReadings(earlier: Observation | undefined, latest: Observation): Observation {
  if (!earlier) return latest
  return { ...latest, openToWork: bestReading([earlier.openToWork, latest.openToWork]), hiring: bestReading([earlier.hiring, latest.hiring]) }
}

function mergePeople(earlier: Person[], latest: Person[]): Person[] {
  const byId = new Map(earlier.map((person) => [person.id, person]))
  for (const person of latest) byId.set(person.id, person)
  return [...byId.values()]
}

function toScreenshotResult({ fileName, cards }: ScreenshotReading): Screenshot {
  const uncertainCount = cards.filter((card) => card.openToWork.status === 'UNCERTAIN' || card.hiring.status === 'UNCERTAIN').length
  return {
    fileName,
    peopleDetected: cards.length,
    uncertainCount,
    outcome: uncertainCount > 0 ? 'warning' : 'processed',
    warning: uncertainCount > 0 ? `${uncertainCount} uncertain avatar classification(s)` : null,
  }
}
