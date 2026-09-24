import { createHash } from 'node:crypto'
import { normalizeIdentity, type VisibleIdentity } from '../../shared/domain/IdentityText.ts'
import { type PhotoPrint, photosDiffer, photosMatch } from './PhotoPrint.ts'
import { titleEvidence } from './SamePerson.ts'

export { normalizeIdentity, type VisibleIdentity }

export function personHash(identity: VisibleIdentity): string {
  return hashOf(normalizeIdentity(identity))
}

export interface SeenPerson {
  displayName: string
  headline: string | null
  photoPrint?: PhotoPrint | null
}

export interface KnownPerson extends SeenPerson {
  personHash: string
}

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

function clearlySomeoneElse(person: SeenPerson, namesake: KnownPerson): boolean {
  const titles = titleEvidence(person.headline, namesake.headline)
  if (!person.photoPrint || !namesake.photoPrint) return titles === 'different'
  return photosDiffer(person.photoPrint, namesake.photoPrint) && titles !== 'same'
}

function samePhoto(person: SeenPerson, namesake: KnownPerson): boolean {
  return Boolean(person.photoPrint && namesake.photoPrint) && photosMatch(person.photoPrint as PhotoPrint, namesake.photoPrint as PhotoPrint)
}

function sameTitleWithoutAPhoto(person: SeenPerson, namesake: KnownPerson): boolean {
  return (!person.photoPrint || !namesake.photoPrint) && titleEvidence(person.headline, namesake.headline) !== 'different'
}

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
