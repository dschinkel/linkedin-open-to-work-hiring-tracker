import type { Classification, HiringStatus, OpenToWorkStatus } from '../../shared/domain/Observation.ts'

/** One person card as read from one screenshot. Overlapping screenshots produce several cards for the same person. */
export interface DetectedCard {
  screenshotFileName: string
  displayName: string
  headline: string | null
  companyName: string | null
  openToWork: Classification<OpenToWorkStatus>
  hiring: Classification<HiringStatus>
}

export interface UniquePerson {
  identity: string
  card: DetectedCard
  openToWork: Classification<OpenToWorkStatus>
  hiring: Classification<HiringStatus>
  seenInScreenshots: string[]
}

export interface DeduplicatedScan {
  people: UniquePerson[]
  cardsDetected: number
  duplicateCount: number
}

/** Readings this confident that still disagree mean the classifier is wrong somewhere, so neither is trusted. */
const confidentReading = 0.9

/**
 * Collapses every card from a day's screenshots into one entry per person, so someone who appears in two
 * overlapping screenshots is counted once. `identify` turns a card's visible text into a stable identity
 * (the analyzer uses the SHA-256 person hash); no face recognition is involved.
 */
export function deduplicateCards(cards: DetectedCard[], identify: (card: DetectedCard) => string): DeduplicatedScan {
  const cardsByPerson = groupByIdentity(cards, identify)
  const people = [...cardsByPerson.entries()].map(([identity, personCards]) => mergeCards(identity, personCards))
  return { people, cardsDetected: cards.length, duplicateCount: cards.length - people.length }
}

function groupByIdentity(cards: DetectedCard[], identify: (card: DetectedCard) => string): Map<string, DetectedCard[]> {
  const groups = new Map<string, DetectedCard[]>()
  for (const card of cards) {
    const identity = identify(card)
    groups.set(identity, [...(groups.get(identity) ?? []), card])
  }
  return groups
}

function mergeCards(identity: string, cards: DetectedCard[]): UniquePerson {
  return {
    identity,
    card: cards[0],
    openToWork: bestReading(cards.map((card) => card.openToWork)),
    hiring: bestReading(cards.map((card) => card.hiring)),
    seenInScreenshots: [...new Set(cards.map((card) => card.screenshotFileName))],
  }
}

/** The clearest classified reading wins; confident readings that contradict each other become UNCERTAIN. */
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
