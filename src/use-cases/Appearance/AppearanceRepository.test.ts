// @vitest-environment jsdom
import { appearanceRepositoryFor, type AppearanceStorage } from './AppearanceRepository'

function inMemoryStorage(): AppearanceStorage {
  const saved = new Map<string, string>()
  return {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => {
      saved.set(key, value)
    },
  }
}

const blockedStorage: AppearanceStorage = {
  getItem: () => {
    throw new Error('storage blocked')
  },
  setItem: () => {
    throw new Error('storage blocked')
  },
}

describe('remembered appearance', () => {
  it('starts in dark mode with the ocean theme when nothing was chosen before', () => {
    const repository = appearanceRepositoryFor(inMemoryStorage)

    expect([repository.loadMode(), repository.loadTheme()]).toEqual(['dark', 'ocean'])
  })

  it('remembers the chosen mode and theme for the next visit', () => {
    const storage = inMemoryStorage()
    appearanceRepositoryFor(() => storage).saveMode('light')
    appearanceRepositoryFor(() => storage).saveTheme('ocean')

    const nextVisit = appearanceRepositoryFor(() => storage)

    expect([nextVisit.loadMode(), nextVisit.loadTheme()]).toEqual(['light', 'ocean'])
  })

  it('ignores a remembered choice it does not recognize', () => {
    const storage = inMemoryStorage()
    storage.setItem('tracker.appearanceMode', 'sepia')
    storage.setItem('tracker.colorTheme', 'grape')

    const repository = appearanceRepositoryFor(() => storage)

    expect([repository.loadMode(), repository.loadTheme()]).toEqual(['dark', 'ocean'])
  })

  it('falls back to the defaults when storage is blocked', () => {
    const repository = appearanceRepositoryFor(() => blockedStorage)

    expect([repository.loadMode(), repository.loadTheme()]).toEqual(['dark', 'ocean'])
  })

  it('keeps going when a choice cannot be remembered', () => {
    const repository = appearanceRepositoryFor(() => blockedStorage)

    expect(() => repository.saveTheme('green')).not.toThrow()
  })

  it('falls back to the defaults when storage cannot even be opened', () => {
    const repository = appearanceRepositoryFor(() => {
      throw new Error('no storage in this browser')
    })

    expect(repository.loadTheme()).toBe('ocean')
  })
})
