// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { insideTracker, settings } from '@/test-support/trackerFixtures'
import type { SettingsRepository } from './SettingsRepository'
import { useClearAllData } from './useClearAllData'

function repositoryThatClears(): SettingsRepository & { clears: number } {
  const repository = {
    clears: 0,
    load: async () => settings(),
    save: async (saved: ReturnType<typeof settings>) => saved,
    clearAllData: async () => {
      repository.clears += 1
      return { message: 'All data was deleted.' }
    },
  }
  return repository
}

describe('clearing all data', () => {
  it('asks for confirmation before deleting anything', () => {
    const repository = repositoryThatClears()
    const { result } = renderHook(() => useClearAllData(repository), { wrapper: insideTracker() })

    act(() => result.current.askToConfirm())

    expect([result.current.isConfirmOpen, repository.clears]).toEqual([true, 0])
  })

  it('deletes everything once confirmed, then closes the dialog', async () => {
    const repository = repositoryThatClears()
    const { result } = renderHook(() => useClearAllData(repository), { wrapper: insideTracker() })
    act(() => result.current.askToConfirm())

    act(() => result.current.confirmClear())

    await waitFor(() => expect([repository.clears, result.current.isConfirmOpen, result.current.resultMessage]).toEqual([1, false, 'All data was deleted.']))
  })

  it('deletes nothing when the dialog is dismissed', () => {
    const repository = repositoryThatClears()
    const { result } = renderHook(() => useClearAllData(repository), { wrapper: insideTracker() })
    act(() => result.current.askToConfirm())

    act(() => result.current.changeConfirmOpen(false))

    expect(repository.clears).toBe(0)
  })
})
