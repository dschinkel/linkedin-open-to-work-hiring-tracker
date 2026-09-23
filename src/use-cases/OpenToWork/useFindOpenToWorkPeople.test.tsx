// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import type { OpenToWorkPerson } from '@contracts/api'
import { insideTracker } from '@/test-support/trackerFixtures'
import type { OpenToWorkRepository } from './OpenToWorkRepository'
import { useFindOpenToWorkPeople } from './useFindOpenToWorkPeople'

function openPerson(overrides: Partial<OpenToWorkPerson> = {}): OpenToWorkPerson {
  return {
    personId: 'person-dana-lee',
    displayName: 'Dana Lee',
    headline: 'Senior Software Engineer',
    companyName: null,
    firstSeenOpen: '2026-09-01',
    lastSeenOpen: '2026-09-22',
    wasObservedInLatestScan: true,
    ...overrides,
  }
}

const danaLee = openPerson()
const samOrtiz = openPerson({ personId: 'person-sam-ortiz', displayName: 'Sam Ortiz', headline: 'Product Designer', companyName: 'Contoso', firstSeenOpen: '2026-09-15', lastSeenOpen: '2026-09-18', wasObservedInLatestScan: false })

async function readyOpenList(people: OpenToWorkPerson[]) {
  const repository: OpenToWorkRepository = { people: async () => people }
  const rendered = renderHook(() => useFindOpenToWorkPeople(repository), { wrapper: insideTracker() })
  await waitFor(() => expect(rendered.result.current.status).toBe('ready'))
  return rendered
}

function names(rows: { cells: Record<string, { text: string }> }[]): string[] {
  return rows.map((row) => row.cells.name.text)
}

describe('people open to work', () => {
  it('lists the most recently seen people first', async () => {
    const { result } = await readyOpenList([samOrtiz, danaLee])

    expect(names(result.current.rows)).toEqual(['Dana Lee', 'Sam Ortiz'])
  })

  it('counts the people showing the frame', async () => {
    const { result } = await readyOpenList([danaLee, samOrtiz])

    expect(result.current.resultSummary).toBe('2 people showing #OPENTOWORK')
  })

  it('searches by title as well as name', async () => {
    const { result } = await readyOpenList([danaLee, samOrtiz])

    act(() => result.current.searchByNameOrTitle('designer'))

    expect(names(result.current.rows)).toEqual(['Sam Ortiz'])
  })

  it('says when the company is not visible', async () => {
    const { result } = await readyOpenList([danaLee])

    expect(result.current.rows[0].cells.company.text).toBe('Company not visible')
  })

  it('greys out people missing from the latest scan', async () => {
    const { result } = await readyOpenList([samOrtiz])

    expect(result.current.rows[0].isMuted).toBe(true)
  })

  it('sorts by first seen date, not by the shown text, when that column is clicked', async () => {
    const { result } = await readyOpenList([samOrtiz, danaLee])

    act(() => result.current.sortBy('firstSeen'))

    expect(names(result.current.rows)).toEqual(['Dana Lee', 'Sam Ortiz'])
  })

  it('makes every column sortable', async () => {
    const { result } = await readyOpenList([danaLee])

    expect(result.current.columns.every((column) => column.isSortable)).toBe(true)
  })

  it('shows nobody open when no one has the frame', async () => {
    const { result } = await readyOpenList([])

    expect(result.current).toMatchObject({ hasPeople: false, showNobodyOpen: true })
  })
})
