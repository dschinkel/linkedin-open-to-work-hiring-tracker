import type { DetectedCard } from './Deduplication.ts'
import { type PhotoPrint, photosDiffer, photosMatch } from './PhotoPrint.ts'

export type Evidence = 'same' | 'different' | 'unknown'
/**
 * Names too far apart for their letters alone to say it's one person: one holds the other's words (OCR read only part
 * of it, or an emoji as letters), or short names a letter apart ("Laura", "LauraT"). Only the photo can tell.
 */
type NameEvidence = Evidence | 'partly'

/**
 * Whether two cards show one person, going by three things seen on the card: the name, the photo, and the title.
 * - One screenshot never shows a person twice.
 * - The same name is one person unless the photos (or, without a telling photo, the titles) clearly differ:
 *   different people can share a name.
 * - A name one or two letters off (OCR misreading "ã" as "b") is one person only when the photo, or without a
 *   telling photo the title, confirms it.
 * - A name with words missing or added ("Kim" for "Kim Hojgaard-Hansen"), or a short name a letter off, is one
 *   person only when the photo matches, or without a telling photo, when a long title matches.
 * LinkedIn's grey placeholder photo is shown for many people, so it tells nothing about who someone is.
 */
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

/**
 * Names match letter for letter ('same'), one holds the other's words or a short name is a letter off ('partly'),
 * a longer name is a letter or two off ('unknown'), or they differ. Spaces and punctuation don't count: OCR drops and adds them ("LauraT" is "Laura T.").
 */
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

/** Only a name's letters and digits, comparable: "Laura T." and "LauraT" are both "laurat". */
export function lettersOf(name: string): string {
  return comparableName(name).replace(/[^\p{L}\p{N}]/gu, '')
}

/** Case, spacing, and accents don't make a different name: "Jesús  Spínola" is "jesus spinola". */
export function comparableName(name: string): string {
  const known = comparableNames.get(name)
  if (known !== undefined) return known
  const comparable = name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
  if (comparableNames.size > 50_000) comparableNames.clear()
  comparableNames.set(name, comparable)
  return comparable
}

/** Names already made comparable: every card's name is compared with many others. */
const comparableNames = new Map<string, string>()

/** Every word of the shorter name, in order, in the longer one; at least three letters' worth. */
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

/** LinkedIn's grey placeholder, shown for everyone without a photo of their own. */
export function isPlaceholder(print: PhotoPrint, placeholderPhotos: ReadonlySet<PhotoPrint>): boolean {
  return [...placeholderPhotos].some((placeholder) => photosMatch(placeholder, print))
}

/**
 * Titles get cut off at different lengths and OCR drops a word here and there, so a title that starts the other,
 * or shares most of its words, is the same; one sharing almost nothing is different. Too little text tells nothing.
 */
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

/** A title this long, the same on both cards, is as telling as a photo: nobody else writes the same five words. */
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

/** Letters to change, add, or drop to turn one name into the other; stops counting past `limit`. */
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
