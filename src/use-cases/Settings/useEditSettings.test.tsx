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
  }
  return { repository, savedSettings }
}

function settingsRepositoryRefusingSaves(stored: Settings, reason: string): SettingsRepository {
  return {
    load: async () => stored,
    save: async () => {
      throw new Error(reason)
    },
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

  it('shows the confidence thresholds as editable text', async () => {
    const { repository } = settingsRepositoryHolding(settings())

    const { result } = await readySettings(repository)

    expect(result.current.thresholds).toEqual({ open: '0.85', notOpen: '0.15', hiring: '0.9', notHiring: '0.1' })
  })

  it('has nothing to save before anything changes', async () => {
    const { repository } = settingsRepositoryHolding(settings())

    const { result } = await readySettings(repository)

    expect(result.current.isSaveDisabled).toBe(true)
  })

  it('can be saved once something changes', async () => {
    const { repository } = settingsRepositoryHolding(settings())
    const { result } = await readySettings(repository)

    act(() => result.current.changeScanFrequency('weekly'))

    expect(result.current).toMatchObject({ isSaveDisabled: false, settings: { scanFrequency: 'weekly' } })
  })

  it('changes one threshold and keeps its partner', async () => {
    const { repository } = settingsRepositoryHolding(settings())
    const { result } = await readySettings(repository)

    act(() => result.current.changeThreshold('hiring')('0.75'))

    expect(result.current.settings.hiringThresholds).toEqual({ hiring: 0.75, notHiring: 0.1 })
  })

  it('keeps earlier edits when making another', async () => {
    const { repository } = settingsRepositoryHolding(settings())
    const { result } = await readySettings(repository)

    act(() => result.current.changeAfterAnalysis('keep'))
    act(() => result.current.changeRetention('90d'))

    expect(result.current.settings).toMatchObject({ afterAnalysis: 'keep', retention: '90d' })
  })

  it('saves the edited settings', async () => {
    const { repository, savedSettings } = settingsRepositoryHolding(settings())
    const { result } = await readySettings(repository)
    act(() => result.current.changeArchiveDirectory('/Volumes/Backup/archive'))

    act(() => result.current.save())

    await waitFor(() => expect(savedSettings).toEqual([settings({ archiveDirectory: '/Volumes/Backup/archive' })]))
  })

  it('confirms the save and has nothing left to save', async () => {
    const { repository } = settingsRepositoryHolding(settings())
    const { result } = await readySettings(repository)
    act(() => result.current.changeAutomaticProcessing(false))

    act(() => result.current.save())

    await waitFor(() => expect(result.current).toMatchObject({ isSaveDisabled: true, saveMessage: expect.any(String), settings: { automaticProcessing: false } }))
  })

  it('refuses to save a threshold above 1', async () => {
    const { repository, savedSettings } = settingsRepositoryHolding(settings())
    const { result } = await readySettings(repository)
    act(() => result.current.changeThreshold('open')('1.5'))

    act(() => result.current.save())

    expect([savedSettings, result.current.saveMessage === '']).toEqual([[], false])
  })

  it('refuses to save an empty inbox directory', async () => {
    const { repository, savedSettings } = settingsRepositoryHolding(settings())
    const { result } = await readySettings(repository)
    act(() => result.current.changeInboxDirectory(''))

    act(() => result.current.save())

    expect([savedSettings, result.current.saveMessage === '']).toEqual([[], false])
  })

  it('drops the refusal as soon as the draft is edited again', async () => {
    const { repository } = settingsRepositoryHolding(settings())
    const { result } = await readySettings(repository)
    act(() => result.current.changeThreshold('open')('1.5'))
    act(() => result.current.save())

    act(() => result.current.changeThreshold('open')('0.95'))

    expect(result.current.saveMessage).toBe('')
  })

  it('explains why saving failed', async () => {
    const { result } = await readySettings(settingsRepositoryRefusingSaves(settings(), 'Inbox directory does not exist'))
    act(() => result.current.changeScanFrequency('monthly'))

    act(() => result.current.save())

    await waitFor(() => expect(result.current.saveMessage).toContain('Inbox directory does not exist'))
  })
})
