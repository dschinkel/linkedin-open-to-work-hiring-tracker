// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import type { CompanyHiring, HiringPeopleQuery, HiringPerson } from '@contracts/api'
import { hiringPerson, insideTracker } from '@/test-support/trackerFixtures'
import type { HiringRepository } from './HiringRepository'
import { useFindHiringPeople } from './useFindHiringPeople'

const mikeBrown = hiringPerson()
const priyaNair = hiringPerson({ personId: 'person-priya-nair', displayName: 'Priya Nair', lastSeenHiring: '2026-09-10', hiringSince: '2026-09-08', daysHiring: 3, scansSeenHiring: 2, companyName: 'Fabrikam', companyNeedsReview: true, wasObservedInLatestScan: false })

const companiesHiring: CompanyHiring = {
  companies: [
    { companyName: 'Northwind', peopleCount: 3 },
    { companyName: 'Fabrikam', peopleCount: 1 },
  ],
  needsReviewCount: 2,
  notVisibleCount: 1_024,
}

function hiringRepositoryReturning(people: HiringPerson[]) {
  const queries: HiringPeopleQuery[] = []
  const repository: HiringRepository = {
    people: async (query) => {
      queries.push(query)
      return people
    },
    companies: async () => companiesHiring,
  }
  return { repository, queries }
}

async function readyHiringSearch(people: HiringPerson[]) {
  const { repository, queries } = hiringRepositoryReturning(people)
  const rendered = renderHook(() => useFindHiringPeople(repository), { wrapper: insideTracker() })
  await waitFor(() => expect(rendered.result.current.status).toBe('ready'))
  return { ...rendered, queries }
}

describe("who's hiring", () => {
  it('starts with everyone currently hiring, most recently seen first', async () => {
    const { queries } = await readyHiringSearch([mikeBrown])

    expect(queries).toEqual([{ search: '', company: '', status: 'current', companyKnown: 'all', sort: 'lastSeen' }])
  })

  it('searches people by name', async () => {
    const { result, queries } = await readyHiringSearch([mikeBrown])

    act(() => result.current.searchByName('mike'))

    await waitFor(() => expect(queries.at(-1)).toMatchObject({ search: 'mike' }))
  })

  it('finds people who used to be hiring', async () => {
    const { result, queries } = await readyHiringSearch([mikeBrown])

    act(() => result.current.filterByStatus('previous'))

    await waitFor(() => expect(queries.at(-1)).toMatchObject({ status: 'previous' }))
  })

  it('narrows to one company among people whose company is known', async () => {
    const { result, queries } = await readyHiringSearch([mikeBrown])

    act(() => result.current.filterByCompany('Northwind'))
    act(() => result.current.filterByCompanyKnown('known'))

    await waitFor(() => expect(queries.at(-1)).toMatchObject({ company: 'Northwind', companyKnown: 'known' }))
  })

  it('lists the most recently seen people first', async () => {
    const { result } = await readyHiringSearch([priyaNair, mikeBrown])

    expect(result.current.rows.map((row) => row.cells.name.text)).toEqual(['Mike Brown', 'Priya Nair'])
  })

  it('sorts people by how long they have been hiring when that column is clicked', async () => {
    const { result } = await readyHiringSearch([mikeBrown, priyaNair])

    act(() => result.current.sortBy('days'))

    expect(result.current.rows.map((row) => row.cells.name.text)).toEqual(['Priya Nair', 'Mike Brown'])
  })

  it('reverses the order when the same column is clicked again', async () => {
    const { result } = await readyHiringSearch([mikeBrown, priyaNair])

    act(() => result.current.sortBy('name'))
    act(() => result.current.sortBy('name'))

    expect([result.current.sortDirection, result.current.rows[0].cells.name.text]).toEqual(['desc', 'Priya Nair'])
  })

  it('keeps the chosen filters on show', async () => {
    const { result } = await readyHiringSearch([mikeBrown])

    act(() => result.current.filterByStatus('all'))

    expect(result.current.filters.status).toBe('all')
  })

  it('counts the people found', async () => {
    const { result } = await readyHiringSearch([mikeBrown, priyaNair])

    expect(result.current.resultSummary).toContain('2')
  })

  it('says nobody matches when the search finds no one', async () => {
    const { result } = await readyHiringSearch([])

    expect(result.current).toMatchObject({ hasPeople: false, showNoMatches: true })
  })

  it('lists each person with their company', async () => {
    const { result } = await readyHiringSearch([mikeBrown])

    expect(result.current.rows[0].cells).toMatchObject({ name: { text: 'Mike Brown' }, company: { text: 'Northwind' }, since: { text: 'Sep 1' }, days: { text: '22 days · 4 scans' } })
  })

  it('flags a company that needs review', async () => {
    const { result } = await readyHiringSearch([priyaNair])

    expect(result.current.rows[0].cells.company.note).toBeDefined()
  })

  it('mutes people missing from the latest scan', async () => {
    const { result } = await readyHiringSearch([mikeBrown, priyaNair])

    expect(result.current.rows.map((row) => row.isMuted)).toEqual([false, true])
  })

  it('shows how many hiring people each company has', async () => {
    const { result } = await readyHiringSearch([mikeBrown])

    await waitFor(() => expect(result.current.companyRows.slice(0, 2)).toEqual([{ label: 'Northwind', value: '3 people' }, { label: 'Fabrikam', value: '1 person' }]))
  })

  it('counts hiring people whose company needs review or is not visible', async () => {
    const { result } = await readyHiringSearch([mikeBrown])

    await waitFor(() => expect(result.current.companyRows.slice(2).map((row) => row.value)).toEqual(['2 people', '1,024 people']))
  })
})
