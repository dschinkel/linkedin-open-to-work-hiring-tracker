// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import type { OpenToWorkPerson } from '@contracts/api'
import { localToday } from '@/shared-exports/listExport'
import { fakeSnapshotRepository, insideTracker, openToWorkSnapshot, recordingExporter } from '@/test-support/trackerFixtures'
import type { SnapshotRepository } from '@/use-cases/Snapshots/SnapshotRepository'
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
    openSince: '2026-09-01',
    daysOpen: 22,
    scansSeenOpen: 4,
    wasObservedInLatestScan: true,
    ...overrides,
  }
}

const danaLee = openPerson()
const samOrtiz = openPerson({ personId: 'person-sam-ortiz', displayName: 'Sam Ortiz', headline: 'Product Designer', companyName: 'Contoso', firstSeenOpen: '2026-09-15', lastSeenOpen: '2026-09-18', openSince: '2026-09-15', daysOpen: 4, scansSeenOpen: 1, wasObservedInLatestScan: false })

const julyList = openToWorkSnapshot({ people: [samOrtiz, danaLee], peopleCount: 2 })

async function readyOpenList(people: OpenToWorkPerson[], exporter = recordingExporter().exporter, snapshots: SnapshotRepository = fakeSnapshotRepository([julyList]).repository) {
  const repository: OpenToWorkRepository = { people: async () => people }
  const rendered = renderHook(() => useFindOpenToWorkPeople(repository, exporter, snapshots), { wrapper: insideTracker() })
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

  it('sorts by the date the current run began, not by the shown text, when that column is clicked', async () => {
    const { result } = await readyOpenList([samOrtiz, danaLee])
    act(() => result.current.sortBy('openSince'))
    expect(names(result.current.rows)).toEqual(['Dana Lee', 'Sam Ortiz'])
  })

  it('shows since when and for how long each person has been open', async () => {
    const { result } = await readyOpenList([danaLee])
    expect(result.current.rows[0].cells).toMatchObject({ openSince: { text: 'Sep 1' }, timeOpen: { text: '22 days · 4 scans' } })
  })

  it('sorts by how many days people have been open when that column is clicked', async () => {
    const { result } = await readyOpenList([danaLee, samOrtiz])
    act(() => result.current.sortBy('timeOpen'))
    expect(names(result.current.rows)).toEqual(['Sam Ortiz', 'Dana Lee'])
  })

  it('makes every column sortable', async () => {
    const { result } = await readyOpenList([danaLee])

    expect(result.current.columns.every((column) => column.isSortable)).toBe(true)
  })

  it('shows nobody open when no one has the frame', async () => {
    const { result } = await readyOpenList([])

    expect(result.current).toMatchObject({ hasPeople: false, showNobodyOpen: true })
  })

  it('exports the list as shown: only people matching the search, with the same columns', async () => {
    const { exporter, saved } = recordingExporter()
    const { result } = await readyOpenList([danaLee, samOrtiz], exporter)
    act(() => result.current.searchByNameOrTitle('designer'))

    act(() => result.current.exporting.exportAs('xlsx'))

    await waitFor(() =>
      expect([saved[0].columns, saved[0].rows]).toEqual([
        ['Person', 'Title / headline', 'Company', 'Open since', 'Time open', 'Last seen open'],
        [['Sam Ortiz', 'Product Designer', 'Contoso', 'Sep 15', '4 days · 1 scan', 'Sep 18']],
      ]),
    )
  })

  it('exports people in the order they are sorted', async () => {
    const { exporter, saved } = recordingExporter()
    const { result } = await readyOpenList([danaLee, samOrtiz], exporter)
    act(() => result.current.sortBy('timeOpen'))

    act(() => result.current.exporting.exportAs('pdf'))

    await waitFor(() => expect(saved[0].rows.map((row) => row[0])).toEqual(['Sam Ortiz', 'Dana Lee']))
  })

  it("names the file after the audience, the Open to Work list, and today's date", async () => {
    const { exporter, saved } = recordingExporter()
    const { result } = await readyOpenList([danaLee], exporter)

    act(() => result.current.exporting.exportAs('xlsx'))

    await waitFor(() => expect(saved[0].fileName).toBe(`followers-open-to-work-${localToday()}.xlsx`))
  })
})

describe('open to work snapshot on show', () => {
  async function viewingJulyList(exporter = recordingExporter().exporter) {
    const rendered = await readyOpenList([danaLee], exporter)
    act(() => rendered.result.current.snapshots.snapshots[0].load())
    await waitFor(() => expect(rendered.result.current.snapshots.viewedSnapshot).not.toBeNull())
    return rendered
  }

  it('shows the saved people in place of the current list', async () => {
    const { result } = await viewingJulyList()
    expect(names(result.current.rows)).toEqual(['Dana Lee', 'Sam Ortiz'])
  })

  it('keeps greying out people who were missing from the latest scan when it was saved', async () => {
    const { result } = await viewingJulyList()
    expect(result.current.rows.map((row) => row.isMuted)).toEqual([false, true])
  })

  it('searches the saved people', async () => {
    const { result } = await viewingJulyList()
    act(() => result.current.searchByNameOrTitle('designer'))
    expect(names(result.current.rows)).toEqual(['Sam Ortiz'])
  })

  it('shows the current people again after going back', async () => {
    const { result } = await viewingJulyList()
    act(() => result.current.snapshots.backToCurrentList())
    expect(names(result.current.rows)).toEqual(['Dana Lee'])
  })

  it('exports the snapshot on show, named as that snapshot', async () => {
    const { exporter, saved } = recordingExporter()
    const { result } = await viewingJulyList(exporter)

    act(() => result.current.exporting.exportAs('xlsx'))

    await waitFor(() => expect([saved[0].fileName, saved[0].rows.map((row) => row[0])]).toEqual(['followers-open-to-work-snapshot-2026-09-23.xlsx', ['Dana Lee', 'Sam Ortiz']]))
  })

  it('exports a saved snapshot with the same columns as the list', async () => {
    const { exporter, saved } = recordingExporter()
    const { result } = await readyOpenList([danaLee], exporter)

    act(() => result.current.snapshots.snapshots[0].exporting.exportAs('csv'))

    await waitFor(() => expect([saved[0].columns, saved[0].rows[1]]).toEqual([result.current.columns.map((column) => column.label), ['Sam Ortiz', 'Product Designer', 'Contoso', 'Sep 15', '4 days · 1 scan', 'Sep 18']]))
  })
})
