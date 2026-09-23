import { createHash } from 'node:crypto'
import { normalizeIdentity, type VisibleIdentity } from '../../shared/domain/IdentityText.ts'
import { type PhotoPrint, photosDiffer, photosMatch } from './PhotoPrint.ts'
import { titleEvidence } from './SamePerson.ts'

export { normalizeIdentity, type VisibleIdentity }

/** Deterministic pseudonymous key for a visible person. No face recognition, only visible text. */
export function personHash(identity: VisibleIdentity): string {
  return hashOf(normalizeIdentity(identity))
}

/** What is known about a person, from this upload or from earlier days. */
export interface SeenPerson {
  displayName: string
  headline: string | null
  photoPrint?: PhotoPrint | null
}

export interface KnownPerson extends SeenPerson {
  personHash: string
}

/**
 * The identity of each person just seen, in order. Someone whose name nobody else has keeps the usual identity from
 * their name alone. People sharing a name are told apart by their photo, then their title, and keep their own
 * identity from day to day: the first one gets the usual one, the others one numbered after it.
 */
export function resolvePersonHashes(people: SeenPerson[], known: KnownPerson[]): string[] {
  const hashes: string[] = new Array(people.length)
  const knownByName = new Map<string, KnownPerson[]>()
  for (const person of known) {
    const name = normalizeIdentity(asIdentity(person))
    knownByName.set(name, [...(knownByName.get(name) ?? []), person])
  }
  for (const [name, indexes] of groupIndexesByName(people)) {
    const namesakes = knownByName.get(name) ?? []
    resolveNamesakes(indexes.map((index) => people[index]), namesakes).forEach((hash, position) => (hashes[indexes[position]] = hash))
  }
  return hashes
}

function resolveNamesakes(people: SeenPerson[], namesakes: KnownPerson[]): string[] {
  if (people.length === 1 && namesakes.length === 1 && !clearlySomeoneElse(people[0], namesakes[0])) return [namesakes[0].personHash]
  const claimed = new Map<number, string>()
  for (const recognises of [samePhoto, sameTitleWithoutAPhoto]) {
    people.forEach((person, index) => {
      if (claimed.has(index)) return
      const match = namesakes.find((namesake) => ![...claimed.values()].includes(namesake.personHash) && recognises(person, namesake))
      if (match) claimed.set(index, match.personHash)
    })
  }
  const taken = new Set([...namesakes.map((namesake) => namesake.personHash), ...claimed.values()])
  return people.map((person, index) => claimed.get(index) ?? claimNextNumber(person, taken))
}

/**
 * Someone else with the same name: a different photo and not the same title (the same person who changed only their
 * photo keeps their title), or, with no photo on one side to compare, a clearly different title.
 */
function clearlySomeoneElse(person: SeenPerson, namesake: KnownPerson): boolean {
  const titles = titleEvidence(person.headline, namesake.headline)
  if (!person.photoPrint || !namesake.photoPrint) return titles === 'different'
  return photosDiffer(person.photoPrint, namesake.photoPrint) && titles !== 'same'
}

function samePhoto(person: SeenPerson, namesake: KnownPerson): boolean {
  return Boolean(person.photoPrint && namesake.photoPrint) && photosMatch(person.photoPrint as PhotoPrint, namesake.photoPrint as PhotoPrint)
}

/** Without a photo on one side (saved before photos were remembered, or too small to read), the title decides. */
function sameTitleWithoutAPhoto(person: SeenPerson, namesake: KnownPerson): boolean {
  return (!person.photoPrint || !namesake.photoPrint) && titleEvidence(person.headline, namesake.headline) !== 'different'
}

/** The usual identity if it is free, otherwise the name numbered 2, 3, … */
function claimNextNumber(person: SeenPerson, taken: Set<string>): string {
  const name = normalizeIdentity(asIdentity(person))
  let number = 1
  while (taken.has(numbered(name, number))) number += 1
  const hash = numbered(name, number)
  taken.add(hash)
  return hash
}

function numbered(name: string, number: number): string {
  return hashOf(number === 1 ? name : `${name}#${number}`)
}

function groupIndexesByName(people: SeenPerson[]): Map<string, number[]> {
  const byName = new Map<string, number[]>()
  people.forEach((person, index) => {
    const name = normalizeIdentity(asIdentity(person))
    byName.set(name, [...(byName.get(name) ?? []), index])
  })
  return byName
}

function asIdentity({ displayName, headline }: SeenPerson): VisibleIdentity {
  return { displayName, headline, companyName: null }
}

function hashOf(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}
