import type { DetectedCard } from './Deduplication.ts'
import { type PhotoPrint, photosDiffer, photosMatch } from './PhotoPrint.ts'

export type Evidence = 'same' | 'different' | 'unknown'
type NameEvidence = Evidence | 'partly'

export function isSamePerson(first: DetectedCard, second: DetectedCard, placeholderPhotos: ReadonlySet<PhotoPrint>): boolean {
  if (first.screenshotFileName === second.screenshotFileName) return false
  const names = nameEvidence(first.displayName, second.displayName)
  if (names === 'different') return false
  const photos = photoEvidence(first.photoPrint ?? null, second.photoPrint ?? null, placeholderPhotos)
  const titles = titleEvidence(first.headline, second.headline)
  if (names === 'same') return photos === 'same' || (photos === 'unknown' && titles !== 'different')
  if (names === 'partly') return photos === 'same' || (photos === 'unknown' && titles === 'same' && isLong(first.headline))
  return photos === 'same' || (photos === 'unknown' && titles === 'same')
}

export function nameEvidence(first: string, second: string): NameEvidence {
  const firstLetters = lettersOf(first)
  const secondLetters = lettersOf(second)
  if (firstLetters === secondLetters) return 'same'
  if (holdsTheWordsOf(comparableName(first), comparableName(second))) return 'partly'
  const shorterLength = Math.min(firstLetters.length, secondLetters.length)
  if (shorterLength < 4) return 'different'
  const misreadLetters = Math.max(1, Math.min(2, Math.floor(shorterLength / 5)))
  if (editDistance(firstLetters, secondLetters, misreadLetters) > misreadLetters) return 'different'
  return shorterLength >= 6 ? 'unknown' : 'partly'
}

export function lettersOf(name: string): string {
  return comparableName(name).replace(/[^\p{L}\p{N}]/gu, '')
}

export function comparableName(name: string): string {
  const known = comparableNames.get(name)
  if (known !== undefined) return known
  const comparable = name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
  if (comparableNames.size > 50_000) comparableNames.clear()
  comparableNames.set(name, comparable)
  return comparable
}

const comparableNames = new Map<string, string>()

function holdsTheWordsOf(first: string, second: string): boolean {
  const [shorter, longer] = [first.split(' '), second.split(' ')].sort((a, b) => a.length - b.length)
  if (shorter.join('').length < 3) return false
  let position = 0
  for (const word of longer) if (word === shorter[position]) position += 1
  return position === shorter.length
}

function photoEvidence(first: PhotoPrint | null, second: PhotoPrint | null, placeholderPhotos: ReadonlySet<PhotoPrint>): Evidence {
  if (first === null || second === null || isPlaceholder(first, placeholderPhotos) || isPlaceholder(second, placeholderPhotos)) return 'unknown'
  if (photosMatch(first, second)) return 'same'
  return photosDiffer(first, second) ? 'different' : 'unknown'
}

export function isPlaceholder(print: PhotoPrint, placeholderPhotos: ReadonlySet<PhotoPrint>): boolean {
  return [...placeholderPhotos].some((placeholder) => photosMatch(placeholder, print))
}

export function titleEvidence(first: string | null, second: string | null): Evidence {
  const firstWords = titleWords(first)
  const secondWords = titleWords(second)
  if (firstWords.length < 2 || secondWords.length < 2) return 'unknown'
  if (startsTheOther(firstWords, secondWords)) return 'same'
  const shared = firstWords.filter((word) => secondWords.includes(word)).length
  const overlap = shared / new Set([...firstWords, ...secondWords]).size
  if (overlap >= 0.5) return 'same'
  return overlap <= 0.2 ? 'different' : 'unknown'
}

function isLong(title: string | null): boolean {
  return titleWords(title).length >= 5
}

function titleWords(title: string | null): string[] {
  return comparableName(title ?? '').match(/[\p{L}\p{N}]{2,}/gu) ?? []
}

function startsTheOther(a: string[], b: string[]): boolean {
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a]
  return shorter.every((word, index) => word === longer[index] || (index === shorter.length - 1 && longer[index]?.startsWith(word)))
}

function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i]
    for (let j = 1; j <= b.length; j += 1) current.push(Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)))
    if (Math.min(...current) > limit) return limit + 1
    previous = current
  }
  return previous[b.length]
}
