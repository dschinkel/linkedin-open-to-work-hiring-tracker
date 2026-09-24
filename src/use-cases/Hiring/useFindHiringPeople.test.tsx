// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import type { CompanyHiring, HiringPeopleQuery, HiringPerson } from '@contracts/api'
import { localToday } from '@/shared-exports/listExport'
import { fakeSnapshotRepository, hiringPerson, hiringSnapshot, insideTracker, recordingExporter } from '@/test-support/trackerFixtures'
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

const juneHiring = hiringSnapshot({
  filters: { search: '', company: '', status: 'all', companyKnown: 'known', sort: 'lastSeen' },
  people: [hiringPerson({ lastSeenHiring: '2026-06-14' }), hiringPerson({ personId: 'person-priya-nair', displayName: 'Priya Nair', lastSeenHiring: '2026-06-01' })],
  peopleCount: 2,
})

async function readyHiringSearch(people: HiringPerson[], exporter = recordingExporter().exporter) {
  const { repository, queries } = hiringRepositoryReturning(people)
  const rendered = renderHook(() => useFindHiringPeople(repository, exporter, fakeSnapshotRepository([juneHiring]).repository), { wrapper: insideTracker() })
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

  it('exports the people shown, in the order they are sorted, with the same columns', async () => {
    const { repository } = hiringRepositoryReturning([mikeBrown, priyaNair])
    const { exporter, saved } = recordingExporter()
    const { result } = renderHook(() => useFindHiringPeople(repository, exporter), { wrapper: insideTracker() })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    act(() => result.current.sortBy('name'))

    act(() => result.current.exporting.exportAs('xlsx'))

    await waitFor(() => expect([saved[0].columns, saved[0].rows.map((row) => row[0])]).toEqual([result.current.columns.map((column) => column.label), ['Mike Brown', 'Priya Nair']]))
  })

  it('exports how long each person has been hiring', async () => {
    const { repository } = hiringRepositoryReturning([priyaNair])
    const { exporter, saved } = recordingExporter()
    const { result } = renderHook(() => useFindHiringPeople(repository, exporter), { wrapper: insideTracker() })
    await waitFor(() => expect(result.current.status).toBe('ready'))

    act(() => result.current.exporting.exportAs('pdf'))

    await waitFor(() => expect(saved[0].rows[0].slice(3, 5)).toEqual(['Sep 8', '3 days · 2 scans']))
  })

  it("names a Connections file after Connections, the Hiring list, and today's date", async () => {
    const { repository } = hiringRepositoryReturning([mikeBrown])
    const { exporter, saved } = recordingExporter()
    const { result } = renderHook(() => useFindHiringPeople(repository, exporter), { wrapper: insideTracker({ audience: 'contacts' }) })
    await waitFor(() => expect(result.current.status).toBe('ready'))

    act(() => result.current.exporting.exportAs('pdf'))

    await waitFor(() => expect(saved[0].fileName).toBe(`connections-hiring-${localToday()}.pdf`))
  })
})

describe('hiring snapshot on show', () => {
  async function viewingJuneHiring(exporter = recordingExporter().exporter) {
    const rendered = await readyHiringSearch([mikeBrown], exporter)
    act(() => rendered.result.current.snapshots.snapshots[0].load())
    await waitFor(() => expect(rendered.result.current.snapshots.viewedSnapshot).not.toBeNull())
    return rendered
  }

  it('shows the saved people in place of the current list', async () => {
    const { result } = await viewingJuneHiring()
    expect(result.current.rows.map((row) => row.cells.name.text)).toEqual(['Mike Brown', 'Priya Nair'])
  })

  it('shows the filters the snapshot was taken with', async () => {
    const { result } = await viewingJuneHiring()
    expect([result.current.filters.status, result.current.filters.companyKnown, result.current.areSavedFiltersLocked]).toEqual(['all', 'known', true])
  })

  it('searches the saved people by name', async () => {
    const { result } = await viewingJuneHiring()
    act(() => result.current.searchByName('priya'))
    expect(result.current.rows.map((row) => row.cells.name.text)).toEqual(['Priya Nair'])
  })

  it('describes recency as of the day the snapshot was saved', async () => {
    const { result } = await viewingJuneHiring()
    expect(result.current.rows[0].cells.recency.text).toBe('Observed Hiring yesterday')
  })

  it('shows the current people again after going back', async () => {
    const { result } = await viewingJuneHiring()
    act(() => result.current.snapshots.backToCurrentList())
    expect([result.current.rows.map((row) => row.cells.name.text), result.current.areSavedFiltersLocked]).toEqual([['Mike Brown'], false])
  })

  it('exports the snapshot on show, named as that snapshot', async () => {
    const { exporter, saved } = recordingExporter()
    const { result } = await viewingJuneHiring(exporter)

    act(() => result.current.exporting.exportAs('pdf'))

    await waitFor(() => expect([saved[0].fileName, saved[0].rows.length]).toEqual(['followers-hiring-snapshot-2026-06-15.pdf', 2]))
  })

  it('saves a snapshot with the filters in effect', async () => {
    const { repository } = hiringRepositoryReturning([mikeBrown])
    const snapshots = fakeSnapshotRepository()
    const { result } = renderHook(() => useFindHiringPeople(repository, recordingExporter().exporter, snapshots.repository), { wrapper: insideTracker() })
    act(() => result.current.filterByStatus('previous'))

    act(() => result.current.snapshots.saveSnapshot())

    await waitFor(() => expect(snapshots.saves[0][1].filters).toMatchObject({ status: 'previous' }))
  })
})

describe('hiring across all audiences together', () => {
  async function readyAllHiring(people: HiringPerson[], exporter = recordingExporter().exporter) {
    const { repository } = hiringRepositoryReturning(people)
    const rendered = renderHook(() => useFindHiringPeople(repository, exporter, fakeSnapshotRepository().repository), { wrapper: insideTracker({ audience: 'all' }) })
    await waitFor(() => expect(rendered.result.current.status).toBe('ready'))
    return rendered
  }

  it('shows whether each person is a follower, a connection, or both', async () => {
    const { result } = await readyAllHiring([{ ...mikeBrown, seenIn: 'both' }, { ...priyaNair, seenIn: 'contacts' }])
    expect(result.current.rows.map((row) => row.cells.in.text)).toEqual(['Both', 'Connection'])
  })

  it('exports where each person was found', async () => {
    const { exporter, saved } = recordingExporter()
    const { result } = await readyAllHiring([{ ...mikeBrown, seenIn: 'followers' }], exporter)

    act(() => result.current.exporting.exportAs('csv'))

    await waitFor(() => expect(saved[0].rows[0][saved[0].columns.indexOf('In')]).toBe('Follower'))
  })

  it("names the file after all audiences, the Hiring list, and today's date", async () => {
    const { exporter, saved } = recordingExporter()
    const { result } = await readyAllHiring([mikeBrown], exporter)

    act(() => result.current.exporting.exportAs('xlsx'))

    await waitFor(() => expect(saved[0].fileName).toBe(`all-hiring-${localToday()}.xlsx`))
  })

  it('leaves out where people were found when showing one audience', async () => {
    const { result } = await readyHiringSearch([mikeBrown])
    expect(result.current.columns.map((column) => column.label)).not.toContain('In')
  })
})
