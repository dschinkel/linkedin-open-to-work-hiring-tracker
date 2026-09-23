import { type DetectedCard, deduplicateCards } from './Deduplication.ts'
import { normalizeIdentity } from '../../shared/domain/IdentityText.ts'

const identify = (card: DetectedCard): string => normalizeIdentity(card)

function card(displayName: string, screenshotFileName: string, overrides: Partial<DetectedCard> = {}): DetectedCard {
  return {
    screenshotFileName,
    displayName,
    headline: 'Staff Engineer',
    companyName: 'Acme',
    openToWork: { status: 'NOT_OPEN', confidence: 0.97, classificationMethod: 'opencv' },
    hiring: { status: 'NOT_HIRING', confidence: 0.97, classificationMethod: 'opencv' },
    ...overrides,
  }
}

const open = (confidence: number) => ({ status: 'OPEN' as const, confidence, classificationMethod: 'opencv' as const })
const notOpen = (confidence: number) => ({ status: 'NOT_OPEN' as const, confidence, classificationMethod: 'opencv' as const })
const uncertain = { status: 'UNCERTAIN' as const, confidence: 0.55, classificationMethod: 'vision' as const }

describe('overlapping screenshots', () => {
  it('counts people who appear in two screenshots only once', () => {
    const first = ['John', 'Susan', 'Mike', 'Jennifer', 'Robert'].map((name) => card(name, 'shot-1.png'))
    const second = ['Jennifer', 'Robert', 'Lisa', 'James', 'Sarah'].map((name) => card(name, 'shot-2.png'))

    const scan = deduplicateCards([...first, ...second], identify)

    expect([scan.people.length, scan.duplicateCount, scan.cardsDetected]).toEqual([8, 2, 10])
  })

  it('counts someone once when their headline is cut off at the edge of one screenshot', () => {
    const scan = deduplicateCards([card('Jane Smith', 'shot-1.png'), card('Jane Smith', 'shot-2.png', { headline: 'Staff Engin', companyName: null })], identify)

    expect(scan.people.length).toBe(1)
  })

  it('treats differences in case and spacing as the same person', () => {
    const scan = deduplicateCards([card('Jane Smith', 'shot-1.png'), card('JANE  SMITH ', 'shot-2.png')], identify)

    expect(scan.people).toHaveLength(1)
  })

  it('remembers every screenshot a person appeared in', () => {
    const scan = deduplicateCards([card('Jane Smith', 'shot-1.png'), card('Jane Smith', 'shot-2.png')], identify)

    expect(scan.people[0].seenInScreenshots).toEqual(['shot-1.png', 'shot-2.png'])
  })

  it('keeps a clear reading over an uncertain one from another screenshot', () => {
    const scan = deduplicateCards([card('Jane', 'shot-1.png', { openToWork: uncertain }), card('Jane', 'shot-2.png', { openToWork: open(0.96) })], identify)

    expect(scan.people[0].openToWork.status).toBe('OPEN')
  })

  it('marks a person uncertain when two confident readings disagree', () => {
    const scan = deduplicateCards([card('Jane', 'shot-1.png', { openToWork: open(0.95) }), card('Jane', 'shot-2.png', { openToWork: notOpen(0.93) })], identify)

    expect(scan.people[0].openToWork.status).toBe('UNCERTAIN')
  })

  it('trusts the confident reading when the other one is weak', () => {
    const scan = deduplicateCards([card('Jane', 'shot-1.png', { openToWork: open(0.96) }), card('Jane', 'shot-2.png', { openToWork: notOpen(0.72) })], identify)

    expect(scan.people[0].openToWork.status).toBe('OPEN')
  })
})

const photoOf = (red: number, green: number, blue: number) => [red, green, blue].map((value) => value.toString(16).padStart(2, '0').repeat(64)).join('')
const placeholderPhoto = photoOf(157, 179, 200)

describe('people who share a name', () => {
  it('counts two people with one name but different photos as two', () => {
    const scan = deduplicateCards([card('Muhammad Hassan', 'shot-1.png', { photoPrint: photoOf(200, 150, 90) }), card('Muhammad Hassan', 'shot-2.png', { photoPrint: photoOf(40, 90, 170) })], identify)

    expect(scan.people).toHaveLength(2)
  })

  it('counts two people with one name in the same screenshot as two', () => {
    expect(deduplicateCards([card('Jane Smith', 'shot-1.png'), card('Jane Smith', 'shot-1.png')], identify).people).toHaveLength(2)
  })

  it('keeps no photo for someone showing the placeholder photo, however slightly it reads differently', () => {
    const scan = deduplicateCards([card('Ali Khan', 'shot-1.png', { photoPrint: photoOf(157, 179, 200) }), card('Grace Hopper', 'shot-1.png', { photoPrint: photoOf(160, 180, 204) })], identify)

    expect(scan.people.map((person) => person.photoPrint)).toEqual([null, null])
  })

  it('keeps the photo of each person', () => {
    const scan = deduplicateCards([card('Jane Smith', 'shot-1.png', { photoPrint: photoOf(200, 150, 90) })], identify)

    expect(scan.people[0].photoPrint).toBe(photoOf(200, 150, 90))
  })
})

describe('names OCR misread', () => {
  it('counts a misread name as the same person when the photo matches', () => {
    const scan = deduplicateCards([card('Matheus Simoes', 'shot-1.png', { photoPrint: photoOf(200, 150, 90) }), card('Matheus Simbes', 'shot-2.png', { photoPrint: photoOf(200, 150, 90) }), card('Matheus Simoes', 'shot-3.png', { photoPrint: photoOf(200, 150, 90) })], identify)

    expect(scan.people.map((person) => person.card.displayName)).toEqual(['Matheus Simoes'])
  })

  it('counts a name misread at the start of both words as one person when the photo matches', () => {
    const photo = photoOf(200, 150, 90)
    const scan = deduplicateCards([card('Tejas Deshpande', 'shot-1.png', { photoPrint: photo }), card('lejas Deshpanae', 'shot-2.png', { photoPrint: photo })], identify)

    expect(scan.people).toHaveLength(1)
  })

  it('counts a name read with and without a space as one person', () => {
    const scan = deduplicateCards([card('VanajaR.', 'shot-1.png', { headline: 'Sales Specialist' }), card('Vanaja R.', 'shot-2.png', { headline: 'Sales Specialist' })], identify)

    expect(scan.people).toHaveLength(1)
  })

  it('does not take the placeholder photo, shown for many people, as proof two similar names are one person', () => {
    const cards = [
      card('Ali Khan', 'shot-1.png', { photoPrint: placeholderPhoto, headline: 'Nurse at Mercy General Hospital' }),
      card('Ali Khen', 'shot-2.png', { photoPrint: placeholderPhoto, headline: 'Rust developer building compilers' }),
      card('Grace Hopper', 'shot-2.png', { photoPrint: placeholderPhoto, headline: 'Rear Admiral' }),
    ]

    expect(deduplicateCards(cards, identify).people).toHaveLength(3)
  })
})
