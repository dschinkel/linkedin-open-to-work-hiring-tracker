import { createHash } from 'node:crypto'
import { normalizeIdentity, type VisibleIdentity } from '../../shared/domain/IdentityText.ts'
import { matchNamesakes, type SeenPerson } from './Namesakes.ts'

export { normalizeIdentity, type SeenPerson, type VisibleIdentity }

export function personHash(identity: VisibleIdentity): string {
  return hashOf(normalizeIdentity(identity))
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
  const claimed = matchNamesakes(people, namesakes)
  const taken = new Set([...namesakes, ...claimed.values()].map((namesake) => namesake.personHash))
  return people.map((person, index) => claimed.get(index)?.personHash ?? claimNextNumber(person, taken))
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
