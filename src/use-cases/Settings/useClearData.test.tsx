// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import type { Audience } from '@contracts/api'
import { insideTracker } from '@/test-support/trackerFixtures'
import { forgetCachedTrackers, sizeClientFor } from '@/shared-repositories/trackerQueryClients'
import type { ClearDataRepository } from './ClearDataRepository'
import { useClearData } from './useClearData'

function repositoryThatClears(): ClearDataRepository & { cleared: string[] } {
  const repository = {
    cleared: [] as string[],
    clearEverything: async () => {
      repository.cleared.push('everything')
      return { message: 'All data was deleted.' }
    },
    clearAudience: async (audience: Audience) => {
      repository.cleared.push(audience)
      return { message: `${audience} data was deleted.` }
    },
  }
  return repository
}

afterEach(() => forgetCachedTrackers())

describe('clearing data', () => {
  it('asks for confirmation before deleting anything', () => {
    const repository = repositoryThatClears()
    const { result } = renderHook(() => useClearData('everything', repository), { wrapper: insideTracker() })

    act(() => result.current.askToConfirm())

    expect([result.current.isConfirmOpen, repository.cleared]).toEqual([true, []])
  })

  it('deletes everything once confirmed, then closes the dialog and says what happened', async () => {
    const repository = repositoryThatClears()
    const { result } = renderHook(() => useClearData('everything', repository), { wrapper: insideTracker() })
    act(() => result.current.askToConfirm())

    act(() => result.current.confirmClear())

    await waitFor(() => expect([repository.cleared, result.current.isConfirmOpen, result.current.resultMessage]).toEqual([['everything'], false, 'All data was deleted.']))
  })

  it('deletes only followers when clearing followers, even from the connections pages', async () => {
    const repository = repositoryThatClears()
    const { result } = renderHook(() => useClearData('followers', repository), { wrapper: insideTracker({ audience: 'contacts' }) })

    act(() => result.current.confirmClear())

    await waitFor(() => expect(repository.cleared).toEqual(['followers']))
  })

  it('deletes only connections when clearing connections', async () => {
    const repository = repositoryThatClears()
    const { result } = renderHook(() => useClearData('contacts', repository), { wrapper: insideTracker() })

    act(() => result.current.confirmClear())

    await waitFor(() => expect(repository.cleared).toEqual(['contacts']))
  })

  it('deletes nothing when the dialog is dismissed', () => {
    const repository = repositoryThatClears()
    const { result } = renderHook(() => useClearData('followers', repository), { wrapper: insideTracker() })
    act(() => result.current.askToConfirm())

    act(() => result.current.changeConfirmOpen(false))

    expect([result.current.isConfirmOpen, repository.cleared]).toEqual([false, []])
  })

  it('refreshes the list sizes in the header after clearing', async () => {
    const repository = repositoryThatClears()
    const headerSizes = sizeClientFor('live')
    headerSizes.setQueryData(['network-size', 'live', 'followers'], { peopleCount: 312, latestScanDate: '2026-09-22' })
    const { result } = renderHook(() => useClearData('followers', repository), { wrapper: insideTracker() })

    act(() => result.current.confirmClear())

    await waitFor(() => expect(headerSizes.getQueryState(['network-size', 'live', 'followers'])?.isInvalidated).toBe(true))
  })

})
