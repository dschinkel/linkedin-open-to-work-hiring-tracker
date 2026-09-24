import type { Classification, HiringStatus, OpenToWorkStatus } from '../../shared/domain/Observation.ts'
import { type PhotoPrint, photosMatch } from './PhotoPrint.ts'
import { comparableName, isPlaceholder, isSamePerson, lettersOf, nameEvidence } from './SamePerson.ts'

export interface DetectedCard {
  screenshotFileName: string
  displayName: string
  headline: string | null
  companyName: string | null
  openToWork: Classification<OpenToWorkStatus>
  hiring: Classification<HiringStatus>
  photoPrint?: PhotoPrint | null
}

export interface UniquePerson {
  identity: string
  card: DetectedCard
  photoPrint: PhotoPrint | null
  openToWork: Classification<OpenToWorkStatus>
  hiring: Classification<HiringStatus>
  seenInScreenshots: string[]
}

export interface DeduplicatedScan {
  people: UniquePerson[]
  cardsDetected: number
  duplicateCount: number
}

const confidentReading = 0.9

export function deduplicateCards(cards: DetectedCard[], identify: (card: DetectedCard) => string): DeduplicatedScan {
  const placeholders = placeholderPhotosAmong(cards)
  const people = groupIntoPeople(cards, placeholders).map((personCards) => mergeCards(personCards, identify, placeholders))
  return { people, cardsDetected: cards.length, duplicateCount: cards.length - people.length }
}

function groupIntoPeople(cards: DetectedCard[], placeholders: ReadonlySet<PhotoPrint>): DetectedCard[][] {
  const people: DetectedCard[][] = []
  const peopleByKey = new Map<string, Set<number>>()
  const candidatesUnder = (key: string) => [...(peopleByKey.get(key) ?? [])]
  for (const card of cards) {
    const [exact, ...ends] = nameKeys(card)
    const sameName = candidatesUnder(exact)
    const similarName = [...new Set(ends.flatMap(candidatesUnder))].filter((index) => !sameName.includes(index)).sort((a, b) => a - b)
    const found = [...sameName, ...similarName].find((index) => belongsTo(card, people[index], placeholders))
    const index = found ?? people.push([]) - 1
    people[index].push(card)
    for (const key of [exact, ...ends]) peopleByKey.set(key, (peopleByKey.get(key) ?? new Set()).add(index))
  }
  return people
}

function nameKeys({ displayName, photoPrint }: DetectedCard): string[] {
  const name = comparableName(displayName)
  const words = name.split(' ')
  const wordKeys = photoPrint ? words.filter((word) => word.length >= 3).map((word) => `~${word.slice(0, 3)}`) : []
  return [`=${lettersOf(name)}`, `^${words[0].slice(0, 3)} ${(words.at(-1) as string).slice(0, 2)}`, `$${name[0]} ${name.slice(-3)}`, ...wordKeys]
}

function belongsTo(card: DetectedCard, personCards: DetectedCard[], placeholders: ReadonlySet<PhotoPrint>): boolean {
  if (personCards.some((other) => other.screenshotFileName === card.screenshotFileName)) return false
  return personCards.some((other) => isSamePerson(card, other, placeholders))
}

export function placeholderPhotosAmong(cards: DetectedCard[]): Set<PhotoPrint> {
  const photographed = cards.filter((card): card is DetectedCard & { photoPrint: PhotoPrint } => Boolean(card.photoPrint))
  const shared = photographed.filter((card, index) =>
    photographed.some((other, otherIndex) => otherIndex !== index && nameEvidence(card.displayName, other.displayName) === 'different' && photosMatch(card.photoPrint, other.photoPrint)),
  )
  return new Set(shared.map((card) => card.photoPrint))
}

function mergeCards(cards: DetectedCard[], identify: (card: DetectedCard) => string, placeholders: ReadonlySet<PhotoPrint>): UniquePerson {
  const card = cardWithTheCommonestName(cards)
  return {
    identity: identify(card),
    card,
    photoPrint: cards.map((each) => each.photoPrint ?? null).find((print) => print !== null && !isPlaceholder(print, placeholders)) ?? null,
    openToWork: bestReading(cards.map((each) => each.openToWork)),
    hiring: bestReading(cards.map((each) => each.hiring)),
    seenInScreenshots: [...new Set(cards.map((each) => each.screenshotFileName))],
  }
}

function cardWithTheCommonestName(cards: DetectedCard[]): DetectedCard {
  const count = (name: string) => cards.filter((card) => card.displayName === name).length
  return cards.reduce((best, card) => (count(card.displayName) > count(best.displayName) ? card : best))
}

export function bestReading<Status extends string>(readings: Classification<Status | 'UNCERTAIN'>[]): Classification<Status | 'UNCERTAIN'> {
  const classified = readings.filter((reading) => reading.status !== 'UNCERTAIN')
  if (classified.length === 0) return mostConfident(readings)
  if (confidentlyContradict(classified)) return { status: 'UNCERTAIN', confidence: 0.5, classificationMethod: mostConfident(classified).classificationMethod }
  return mostConfident(classified)
}

function confidentlyContradict<Status extends string>(readings: Classification<Status>[]): boolean {
  const confidentStatuses = new Set(readings.filter((reading) => reading.confidence >= confidentReading).map((reading) => reading.status))
  return confidentStatuses.size > 1
}

function mostConfident<Status extends string>(readings: Classification<Status>[]): Classification<Status> {
  return readings.reduce((best, reading) => (reading.confidence > best.confidence ? reading : best))
}
