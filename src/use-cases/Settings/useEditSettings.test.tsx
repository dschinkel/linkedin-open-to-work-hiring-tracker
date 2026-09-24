// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import type { Settings } from '@contracts/api'
import { insideTracker, settings } from '@/test-support/trackerFixtures'
import type { SettingsRepository } from './SettingsRepository'
import { useEditSettings } from './useEditSettings'

function settingsRepositoryHolding(stored: Settings) {
  const savedSettings: Settings[] = []
  const repository: SettingsRepository = {
    load: async () => stored,
    save: async (changed) => {
      savedSettings.push(changed)
      return changed
    },
    clearAllData: async () => ({ message: 'not used here' }),
  }
  return { repository, savedSettings }
}

function settingsRepositoryRefusingSaves(stored: Settings, reason: string): SettingsRepository {
  return {
    load: async () => stored,
    save: async () => {
      throw new Error(reason)
    },
    clearAllData: async () => ({ message: 'not used here' }),
  }
}

async function readySettings(repository: SettingsRepository) {
  const rendered = renderHook(() => useEditSettings(repository), { wrapper: insideTracker() })
  await waitFor(() => expect(rendered.result.current.status).toBe('ready'))
  return rendered
}

describe('editing settings', () => {
  it('shows the stored settings', async () => {
    const { repository } = settingsRepositoryHolding(settings({ inboxDirectory: '/Users/dana/LinkedIn/inbox' }))

    const { result } = await readySettings(repository)

    expect(result.current.settings.inboxDirectory).toBe('/Users/dana/LinkedIn/inbox')
  })

  it('saves nothing before anything changes', async () => {
    const { repository, savedSettings } = settingsRepositoryHolding(settings())

    const { result } = await readySettings(repository)

    expect([savedSettings, result.current.saveMessage]).toEqual([[], 'Changes save automatically.'])
  })

  it('shows a change straight away while it saves', async () => {
    const { repository } = settingsRepositoryHolding(settings())
    const { result } = await readySettings(repository)

    act(() => result.current.changeScanFrequency('weekly'))

    expect(result.current).toMatchObject({ saveMessage: 'Saving…', settings: { scanFrequency: 'weekly' } })
  })

  it('keeps earlier edits when making another', async () => {
    const { repository } = settingsRepositoryHolding(settings())
    const { result } = await readySettings(repository)

    act(() => result.current.changeAfterAnalysis('keep'))
    act(() => result.current.changeRetention('90d'))

    expect(result.current.settings).toMatchObject({ afterAnalysis: 'keep', retention: '90d' })
  })

  it('saves an edit by itself shortly after it is made', async () => {
    const { repository, savedSettings } = settingsRepositoryHolding(settings())
    const { result } = await readySettings(repository)

    act(() => result.current.changeArchiveDirectory('/Volumes/Backup/archive'))

    await waitFor(() => expect(savedSettings).toEqual([settings({ archiveDirectory: '/Volumes/Backup/archive' })]))
  })

  it('saves a burst of typing once, with the final value', async () => {
    const { repository, savedSettings } = settingsRepositoryHolding(settings())
    const { result } = await readySettings(repository)

    act(() => result.current.changeInboxDirectory('/Users/dana/Link'))
    act(() => result.current.changeInboxDirectory('/Users/dana/LinkedIn'))

    await waitFor(() => expect(savedSettings).toEqual([settings({ inboxDirectory: '/Users/dana/LinkedIn' })]))
  })

  it('confirms once every change is saved', async () => {
    const { repository } = settingsRepositoryHolding(settings())
    const { result } = await readySettings(repository)

    act(() => result.current.changeAutomaticProcessing(false))

    await waitFor(() => expect(result.current).toMatchObject({ saveMessage: 'All changes saved.', settings: { automaticProcessing: false } }))
  })

  it('does not save an empty inbox directory', async () => {
    const { repository, savedSettings } = settingsRepositoryHolding(settings())
    const { result } = await readySettings(repository)

    act(() => result.current.changeInboxDirectory(''))

    await waitFor(() => expect(result.current.saveMessage).toContain('Not saved'))
    expect(savedSettings).toEqual([])
  })

  it('saves again once an invalid value is corrected', async () => {
    const { repository, savedSettings } = settingsRepositoryHolding(settings())
    const { result } = await readySettings(repository)
    act(() => result.current.changeInboxDirectory(''))
    await waitFor(() => expect(result.current.saveMessage).toContain('Not saved'))

    act(() => result.current.changeInboxDirectory('/Users/dana/LinkedIn'))

    await waitFor(() => expect(savedSettings).toEqual([settings({ inboxDirectory: '/Users/dana/LinkedIn' })]))
  })

  it('explains why saving failed', async () => {
    const { result } = await readySettings(settingsRepositoryRefusingSaves(settings(), 'Inbox directory does not exist'))

    act(() => result.current.changeScanFrequency('monthly'))

    await waitFor(() => expect(result.current.saveMessage).toContain('Inbox directory does not exist'))
  })
})
