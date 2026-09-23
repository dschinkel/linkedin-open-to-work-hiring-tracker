import type { HiringPerson } from '../../contracts/api.ts'
import { aggregateHiringCompanies } from './hiringPeople.ts'

function hiringPerson(overrides: Partial<HiringPerson>): HiringPerson {
  return {
    personId: 'p',
    displayName: 'Jane Smith',
    headline: 'Engineering Manager',
    companyName: 'Acme Corp',
    companyNeedsReview: false,
    firstSeenHiring: '2026-09-18',
    lastSeenHiring: '2026-09-22',
    lastSeen: '2026-09-22',
    daysObservedHiring: 5,
    isCurrentlyHiring: true,
    wasObservedInLatestScan: true,
    ...overrides,
  }
}

describe('companies represented by hiring frames', () => {
  it('counts hiring people per company, merging name variants', () => {
    const people = [hiringPerson({ personId: 'a' }), hiringPerson({ personId: 'b', companyName: 'ACME Corp.' })]

    expect(aggregateHiringCompanies(people).companies).toEqual([{ companyName: 'Acme Corp', peopleCount: 2 }])
  })

  it('counts people whose company is not visible separately', () => {
    expect(aggregateHiringCompanies([hiringPerson({ companyName: null })]).notVisibleCount).toBe(1)
  })

  it('leaves out people whose hiring frame was removed', () => {
    expect(aggregateHiringCompanies([hiringPerson({ isCurrentlyHiring: false })]).companies).toEqual([])
  })
})
