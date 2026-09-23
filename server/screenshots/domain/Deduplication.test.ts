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
