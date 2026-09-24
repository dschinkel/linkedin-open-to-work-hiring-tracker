// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import type { HiringPeopleQuery, Snapshot, SnapshotKind } from '@contracts/api'
import { fakeSnapshotRepository, hiringSnapshot, insideTracker, openToWorkSnapshot, recordingExporter } from '@/test-support/trackerFixtures'
import type { SnapshotRepository } from './SnapshotRepository'
import { useKeepSnapshots } from './useKeepSnapshots'

const beforeLayoffs = openToWorkSnapshot({ peopleCount: 8 })
const lastWeek = openToWorkSnapshot({ id: 'snapshot-last-week', name: 'Last week', createdAt: '2026-09-16T12:00:00.000Z', peopleCount: 1 })
const currentlyHiringAtNorthwind: HiringPeopleQuery = { search: '', company: 'Northwind', status: 'current', companyKnown: 'known', sort: 'lastSeen' }

const listNames = { 'open-to-work': { slug: 'open-to-work', title: 'Open to Work' }, hiring: { slug: 'hiring', title: 'Hiring' } }

function tableOfNames(snapshot: Snapshot) {
  return { columns: ['Person'], rows: snapshot.people.map((person) => [person.displayName]) }
}

async function readySnapshots(repository: SnapshotRepository, kind: SnapshotKind = 'open-to-work', exporter = recordingExporter().exporter) {
  const rendered = renderHook(() => useKeepSnapshots({ kind, list: listNames[kind], filters: currentlyHiringAtNorthwind, tableOf: tableOfNames }, repository, exporter), { wrapper: insideTracker() })
  await waitFor(() => expect(rendered.result.current.status).toBe('ready'))
  return rendered
}

describe('saved snapshots', () => {
  it('lists the newest snapshot first, with how many people it holds', async () => {
    const { result } = await readySnapshots(fakeSnapshotRepository([lastWeek, beforeLayoffs]).repository)
    expect(result.current.snapshots.map((snapshot) => [snapshot.name, snapshot.peopleCount])).toEqual([['Before the layoffs', '8 people'], ['Last week', '1 person']])
  })

  it('says when each snapshot was saved', async () => {
    const { result } = await readySnapshots(fakeSnapshotRepository([beforeLayoffs]).repository)
    expect(result.current.snapshots[0].savedAt).toContain('Sep 23, 2026')
  })

  it('says there are no snapshots before any is saved', async () => {
    const { result } = await readySnapshots(fakeSnapshotRepository().repository)
    expect(result.current).toMatchObject({ hasSnapshots: false, showNoSnapshots: true })
  })

  it('only lists snapshots of its own list', async () => {
    const { result } = await readySnapshots(fakeSnapshotRepository([beforeLayoffs, hiringSnapshot()]).repository)
    expect(result.current.snapshots.map((snapshot) => snapshot.name)).toEqual(['Before the layoffs'])
  })
})

describe('saving a snapshot', () => {
  it('saves the list under the name typed, then lists it', async () => {
    const { repository, saves } = fakeSnapshotRepository()
    const { result } = await readySnapshots(repository)
    act(() => result.current.nameSnapshot('Q3 review'))

    act(() => result.current.saveSnapshot())

    await waitFor(() => expect([saves, result.current.snapshots.map((snapshot) => snapshot.name)]).toEqual([[['open-to-work', { name: 'Q3 review' }]], ['Q3 review']]))
  })

  it('saves the hiring list with the filters in effect', async () => {
    const { repository, saves } = fakeSnapshotRepository()
    const { result } = await readySnapshots(repository, 'hiring')

    act(() => result.current.saveSnapshot())

    await waitFor(() => expect(saves).toEqual([['hiring', { name: '', filters: currentlyHiringAtNorthwind }]]))
  })

  it('empties the name box once saved', async () => {
    const { result } = await readySnapshots(fakeSnapshotRepository().repository)
    act(() => result.current.nameSnapshot('Q3 review'))

    act(() => result.current.saveSnapshot())

    await waitFor(() => expect([result.current.snapshotName, result.current.message]).toEqual(['', 'Saved snapshot “Q3 review”.']))
  })
})

describe('viewing a snapshot', () => {
  it('loads the saved people when a snapshot is opened', async () => {
    const { result } = await readySnapshots(fakeSnapshotRepository([beforeLayoffs]).repository)
    act(() => result.current.snapshots[0].load())
    await waitFor(() => expect(result.current.viewedSnapshot).toEqual(beforeLayoffs))
  })

  it('names the snapshot being viewed and the day it was saved', async () => {
    const { result } = await readySnapshots(fakeSnapshotRepository([beforeLayoffs]).repository)
    act(() => result.current.snapshots[0].load())
    await waitFor(() => expect(result.current.viewingNotice).toMatch(/Before the layoffs.*Sep 23/))
  })

  it('marks the snapshot being viewed in the list', async () => {
    const { result } = await readySnapshots(fakeSnapshotRepository([beforeLayoffs, lastWeek]).repository)
    act(() => result.current.snapshots[1].load())
    expect(result.current.snapshots.map((snapshot) => snapshot.isViewed)).toEqual([false, true])
  })

  it('goes back to the current list', async () => {
    const { result } = await readySnapshots(fakeSnapshotRepository([beforeLayoffs]).repository)
    act(() => result.current.snapshots[0].load())
    await waitFor(() => expect(result.current.viewedSnapshot).not.toBeNull())

    act(() => result.current.backToCurrentList())

    expect([result.current.isViewingSnapshot, result.current.viewedSnapshot]).toEqual([false, null])
  })

  it('does not save a new snapshot while an old one is on show', async () => {
    const { result } = await readySnapshots(fakeSnapshotRepository([beforeLayoffs]).repository)
    act(() => result.current.snapshots[0].load())
    expect(result.current.canSave).toBe(false)
  })
})

describe('deleting a snapshot', () => {
  it('asks before deleting, naming the snapshot', async () => {
    const { repository, snapshotIds } = fakeSnapshotRepository([beforeLayoffs])
    const { result } = await readySnapshots(repository)

    act(() => result.current.snapshots[0].askToDelete())

    expect([result.current.deleting.isConfirmOpen, result.current.deleting.snapshotName, snapshotIds()]).toEqual([true, 'Before the layoffs', ['snapshot-before-layoffs']])
  })

  it('deletes nothing when the question is dismissed', async () => {
    const { repository, snapshotIds } = fakeSnapshotRepository([beforeLayoffs])
    const { result } = await readySnapshots(repository)
    act(() => result.current.snapshots[0].askToDelete())

    act(() => result.current.deleting.changeConfirmOpen(false))

    expect(snapshotIds()).toEqual(['snapshot-before-layoffs'])
  })

  it('deletes the snapshot once confirmed and drops it from the list', async () => {
    const { repository, snapshotIds } = fakeSnapshotRepository([beforeLayoffs, lastWeek])
    const { result } = await readySnapshots(repository)
    act(() => result.current.snapshots[0].askToDelete())

    act(() => result.current.deleting.confirmDelete())

    await waitFor(() => expect([snapshotIds(), result.current.snapshots.map((snapshot) => snapshot.name), result.current.deleting.isConfirmOpen]).toEqual([['snapshot-last-week'], ['Last week'], false]))
  })

  it('goes back to the current list when the snapshot on show is deleted', async () => {
    const { result } = await readySnapshots(fakeSnapshotRepository([beforeLayoffs]).repository)
    act(() => result.current.snapshots[0].load())
    act(() => result.current.snapshots[0].askToDelete())

    act(() => result.current.deleting.confirmDelete())

    await waitFor(() => expect(result.current.isViewingSnapshot).toBe(false))
  })
})

describe('exporting a saved snapshot', () => {
  const withDana = openToWorkSnapshot({ people: [{ personId: 'dana', displayName: 'Dana Lee', headline: null, companyName: null, firstSeenOpen: '2026-09-01', lastSeenOpen: '2026-09-22', openSince: '2026-09-01', daysOpen: 22, scansSeenOpen: 4, wasObservedInLatestScan: true }], peopleCount: 1 })

  it('exports the saved people without opening the snapshot', async () => {
    const { exporter, saved } = recordingExporter()
    const { result } = await readySnapshots(fakeSnapshotRepository([withDana]).repository, 'open-to-work', exporter)

    act(() => result.current.snapshots[0].exporting.exportAs('pdf'))

    await waitFor(() => expect([saved[0].rows, result.current.isViewingSnapshot]).toEqual([[['Dana Lee']], false]))
  })

  it('names the file after the list, as a snapshot, and the day it was saved', async () => {
    const { exporter, saved } = recordingExporter()
    const { result } = await readySnapshots(fakeSnapshotRepository([withDana]).repository, 'open-to-work', exporter)

    act(() => result.current.snapshots[0].exporting.exportAs('xlsx'))

    await waitFor(() => expect(saved[0].fileName).toBe('followers-open-to-work-snapshot-2026-09-23.xlsx'))
  })

  it('titles the file with the snapshot name', async () => {
    const { exporter, saved } = recordingExporter()
    const { result } = await readySnapshots(fakeSnapshotRepository([withDana]).repository, 'open-to-work', exporter)

    act(() => result.current.snapshots[0].exporting.exportAs('pdf'))

    await waitFor(() => expect(saved[0].title).toContain('Before the layoffs'))
  })

  it('reports the export only beside the snapshot that was exported', async () => {
    const { exporter } = recordingExporter()
    const { result } = await readySnapshots(fakeSnapshotRepository([withDana, lastWeek]).repository, 'open-to-work', exporter)

    act(() => result.current.snapshots[0].exporting.exportAs('csv'))

    await waitFor(() => expect(result.current.snapshots.map((snapshot) => snapshot.exporting.exportMessage !== '')).toEqual([true, false]))
  })
})
