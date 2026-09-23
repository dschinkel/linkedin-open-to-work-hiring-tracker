import { extractCompany } from '../domain/company.ts'
import type {
  Classification,
  HiringStatus,
  Network,
  Observation,
  OpenToWorkStatus,
  Person,
  Scan,
  Screenshot,
} from '../domain/observation.ts'
import { type DetectedCard, deduplicateCards, type UniquePerson } from '../domain/deduplication.ts'
import { normalizeIdentity } from '../domain/identityText.ts'
import { addDays } from '../domain/scanDate.ts'
import { companies, firstNames, lastNames, titles, vagueHeadlines } from './sampleVocabulary.ts'

export interface SampleNetworkOptions {
  latestScanDate: string
  days: number
  peopleCount: number
  seed: number
}

type Random = () => number

interface TrueFrames {
  isOpen: boolean
  isHiring: boolean
  hasLeft: boolean
}

interface SampleState {
  random: Random
  people: Person[]
  frames: Map<string, TrueFrames>
  scans: Scan[]
  observations: Observation[]
}

const cardsPerScreenshot = 14
/** Cards repeated at the top of the next screenshot, as happens when scrolling. */
const overlappingCards = 2
const sampledShare = 0.9
const skippedDayShare = 0.12
/** Chance per day that someone unfollows or disconnects, so the sample has people who left. */
const leaveChancePerDay = 0.0006

/** Deterministic, realistic-looking history so the dashboard is explorable before real screenshots exist. */
export function generateSampleNetwork(options: SampleNetworkOptions): Network {
  const random = seededRandom(options.seed)
  const people = Array.from({ length: options.peopleCount }, (_, position) => samplePerson(position, random))
  const state: SampleState = { random, people, frames: initialFrames(people, random), scans: [], observations: [] }
  for (let dayOffset = options.days - 1; dayOffset >= 0; dayOffset -= 1) {
    advanceOneDay(state, 1 - dayOffset / options.days)
    if (isScanDay(dayOffset, random)) recordScan(state, addDays(options.latestScanDate, -dayOffset))
  }
  return { people, scans: state.scans, observations: state.observations }
}

/** Mulberry32: small, fast, repeatable. */
function seededRandom(seed: number): Random {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6d2b79f5) >>> 0
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296
  }
}

function pick<Item>(items: Item[], random: Random): Item {
  return items[Math.floor(random() * items.length)]
}

function samplePerson(position: number, random: Random): Person {
  const displayName = `${pick(firstNames, random)} ${pick(lastNames, random)}`
  const { headline, explicitCompany } = sampleHeadline(random)
  const company = withOccasionalOcrNoise(extractCompany(headline, explicitCompany), random)
  return {
    id: `person-${String(position + 1).padStart(4, '0')}`,
    personHash: `sample-hash-${position + 1}`, // sample people need no real SHA-256; keeps the seed browser-safe
    displayName,
    headline,
    ...company,
  }
}

function sampleHeadline(random: Random): { headline: string; explicitCompany: string | null } {
  const roll = random()
  const title = pick(titles, random)
  if (roll < 0.55) return { headline: `${title} at ${pick(companies, random)}`, explicitCompany: null }
  if (roll < 0.75) return { headline: title, explicitCompany: pick(companies, random) }
  return { headline: pick(vagueHeadlines, random), explicitCompany: null }
}

function withOccasionalOcrNoise(company: ReturnType<typeof extractCompany>, random: Random): ReturnType<typeof extractCompany> {
  if (company.companyName === null || random() > 0.04) return company
  return { ...company, companyConfidence: 0.62 }
}

function initialFrames(people: Person[], random: Random): Map<string, TrueFrames> {
  return new Map(people.map((person) => [person.id, { isOpen: random() < 0.08, isHiring: random() < 0.045, hasLeft: false }]))
}

/** Entry into Open to Work slowly rises over the period, so the trend has a story to tell. */
function advanceOneDay(state: SampleState, progress: number): void {
  const openEntry = 0.0008 + progress * 0.0012
  for (const frames of state.frames.values()) {
    frames.isOpen = flip(frames.isOpen, openEntry, 0.012, state.random)
    frames.isHiring = flip(frames.isHiring, 0.0008, 0.015, state.random)
    frames.hasLeft ||= state.random() < leaveChancePerDay
  }
}

function flip(isOn: boolean, turnOnChance: number, turnOffChance: number, random: Random): boolean {
  return isOn ? random() >= turnOffChance : random() < turnOnChance
}

function isScanDay(dayOffset: number, random: Random): boolean {
  return dayOffset === 0 || random() > skippedDayShare
}

function recordScan(state: SampleState, scanDate: string): void {
  const scanId = `scan-${scanDate}`
  const seen = state.people.filter((person) => !state.frames.get(person.id)?.hasLeft && state.random() < sampledShare)
  const personIdByIdentity = new Map(seen.map((person) => [normalizeIdentity(person), person.id]))
  const screenshots = overlappingScreenshots(seen).map((people, shot) => ({ fileName: macScreenshotName(scanDate, shot), people }))
  const cards = screenshots.flatMap(({ fileName, people }) => people.map((person) => detectCard(person, fileName, state)))
  const deduplicated = deduplicateCards(cards, normalizeIdentity)
  state.observations.push(...deduplicated.people.map((person) => toObservation(scanId, person, personIdByIdentity)))
  state.scans.push({
    id: scanId,
    scanDate,
    screenshots: screenshots.map(({ fileName }) => toScreenshot(fileName, cards)),
    cardsDetected: deduplicated.cardsDetected,
    duplicateCount: deduplicated.duplicateCount,
  })
}

/** Like a person scrolling: each screenshot repeats the last few cards of the one before. */
function overlappingScreenshots(people: Person[]): Person[][] {
  const step = cardsPerScreenshot - overlappingCards
  const shots: Person[][] = []
  for (let start = 0; start < people.length; start += step) shots.push(people.slice(start, start + cardsPerScreenshot))
  return shots
}

/** Every card is read independently, so the same person can be read differently in two screenshots. */
function detectCard(person: Person, screenshotFileName: string, state: SampleState): DetectedCard {
  const frames = state.frames.get(person.id) as TrueFrames
  return {
    screenshotFileName,
    displayName: person.displayName,
    headline: person.headline,
    companyName: person.companyName,
    openToWork: classify<OpenToWorkStatus>(frames.isOpen ? 'OPEN' : 'NOT_OPEN', state.random),
    hiring: classify<HiringStatus>(frames.isHiring ? 'HIRING' : 'NOT_HIRING', state.random),
  }
}

function toObservation(scanId: string, person: UniquePerson, personIdByIdentity: Map<string, string>): Observation {
  return { scanId, personId: personIdByIdentity.get(person.identity) as string, openToWork: person.openToWork, hiring: person.hiring }
}

function classify<Status extends string>(trueStatus: Status, random: Random): Classification<Status | 'UNCERTAIN'> {
  const roll = random()
  if (roll < 0.006) return { status: 'UNCERTAIN', confidence: 0.45 + random() * 0.2, classificationMethod: 'vision' }
  if (roll < 0.04) return { status: trueStatus, confidence: 0.7 + random() * 0.19, classificationMethod: 'vision' }
  return { status: trueStatus, confidence: 0.9 + random() * 0.095, classificationMethod: 'opencv' }
}

function toScreenshot(fileName: string, cards: DetectedCard[]): Screenshot {
  const shotCards = cards.filter((card) => card.screenshotFileName === fileName)
  const uncertainCount = shotCards.filter((card) => card.openToWork.status === 'UNCERTAIN' || card.hiring.status === 'UNCERTAIN').length
  return {
    fileName,
    peopleDetected: shotCards.length,
    uncertainCount,
    outcome: uncertainCount > 0 ? 'warning' : 'processed',
    warning: uncertainCount > 0 ? `${uncertainCount} uncertain avatar classification(s)` : null,
  }
}

function macScreenshotName(scanDate: string, shot: number): string {
  const totalSeconds = 9 * 3600 + 60 + shot * 7
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `Screenshot ${scanDate} at ${Math.floor(totalSeconds / 3600)}.${minutes}.${seconds} AM.png`
}
