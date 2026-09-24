import type { HiringPerson } from '@contracts/api'
import { describeHiringPerson } from './describeHiring'

const today = new Date(2026, 8, 22)

function hiringPerson(overrides: Partial<HiringPerson>): HiringPerson {
  return {
    personId: 'p',
    displayName: 'Mike Brown',
    headline: 'CTO',
    companyName: null,
    companyNeedsReview: false,
    firstSeenHiring: '2026-09-18',
    lastSeenHiring: '2026-09-22',
    lastSeen: '2026-09-22',
    hiringSince: '2026-09-18',
    daysHiring: 5,
    scansSeenHiring: 2,
    isCurrentlyHiring: true,
    wasObservedInLatestScan: true,
    ...overrides,
  }
}

describe('hiring person avatar', () => {
  it('stands in for the photo with the first letters of the first two names', () => {
    expect(describeHiringPerson(hiringPerson({ displayName: 'ana maria de souza' }), today).initials).toBe('AM')
  })
})

describe('hiring person recency', () => {
  it('says Hiring was observed today only when seen today', () => {
    expect(describeHiringPerson(hiringPerson({}), today).recency).toBe('Observed Hiring today')
  })

  it('labels a stale observation with its last observed date', () => {
    const stale = hiringPerson({ lastSeenHiring: '2026-08-01', wasObservedInLatestScan: false })

    expect(describeHiringPerson(stale, today).recency).toContain('last observed Hiring Aug 1')
  })

  it('shows a missing company as not visible instead of guessing', () => {
    expect(describeHiringPerson(hiringPerson({}), today).company).toBe('Company not visible')
  })
})
