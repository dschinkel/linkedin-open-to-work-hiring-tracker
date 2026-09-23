// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { appearanceRepositoryFor, type AppearanceStorage } from './AppearanceRepository'
import { useChooseAppearance } from './useChooseAppearance'

const page = document.documentElement

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

/** A device whose light/dark preference can be flipped while the page is open. */
function deviceColorScheme(prefersDark: boolean) {
  const listeners = new Set<() => void>()
  const device = {
    prefersDark,
    matchMedia: () => ({
      get matches() {
        return device.prefersDark
      },
      addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
    }),
    switchTo: (dark: boolean) => {
      device.prefersDark = dark
      listeners.forEach((listener) => listener())
    },
  }
  vi.stubGlobal('matchMedia', device.matchMedia)
  return device
}

function chooseAppearanceWith(storage: AppearanceStorage) {
  return renderHook(() => useChooseAppearance(appearanceRepositoryFor(() => storage)))
}

beforeEach(() => {
  page.classList.remove('dark')
  page.removeAttribute('data-theme')
  deviceColorScheme(false)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('choosing the appearance', () => {
  it('shows dark mode with the ocean theme on a first visit', () => {
    chooseAppearanceWith(inMemoryStorage())

    expect([page.classList.contains('dark'), page.dataset.theme]).toEqual([true, 'ocean'])
  })

  it('switches the page to dark when Dark is chosen', () => {
    const { result } = chooseAppearanceWith(inMemoryStorage())
    act(() => result.current.chooseMode('light'))

    act(() => result.current.chooseMode('dark'))

    expect(page.classList.contains('dark')).toBe(true)
  })

  it('switches the page to light when Light is chosen', () => {
    const { result } = chooseAppearanceWith(inMemoryStorage())

    act(() => result.current.chooseMode('light'))

    expect(page.classList.contains('dark')).toBe(false)
  })

  it('follows a device that prefers dark when System is chosen', () => {
    deviceColorScheme(true)
    const { result } = chooseAppearanceWith(inMemoryStorage())

    act(() => result.current.chooseMode('system'))

    expect(page.classList.contains('dark')).toBe(true)
  })

  it('follows a device that prefers light when System is chosen', () => {
    const { result } = chooseAppearanceWith(inMemoryStorage())

    act(() => result.current.chooseMode('system'))

    expect(page.classList.contains('dark')).toBe(false)
  })

  it('follows the device when it switches to dark while System is chosen', () => {
    const device = deviceColorScheme(false)
    const { result } = chooseAppearanceWith(inMemoryStorage())
    act(() => result.current.chooseMode('system'))

    act(() => device.switchTo(true))

    expect(page.classList.contains('dark')).toBe(true)
  })

  it('paints the page in the chosen color theme', () => {
    const { result } = chooseAppearanceWith(inMemoryStorage())

    act(() => result.current.chooseTheme('ocean'))

    expect(page.dataset.theme).toBe('ocean')
  })

  it('shows the swatch of the chosen color theme', () => {
    const { result } = chooseAppearanceWith(inMemoryStorage())

    act(() => result.current.chooseTheme('rose'))

    expect(result.current.themeSwatch).toBe('oklch(0.6 0.2 5)')
  })

  it('offers six color themes', () => {
    const { result } = chooseAppearanceWith(inMemoryStorage())

    expect(result.current.themeOptions.map((option) => option.label)).toEqual(['Neutral', 'Ocean', 'Rose'])
  })

  it('restores the chosen mode and theme on the next visit', () => {
    const storage = inMemoryStorage()
    const firstVisit = chooseAppearanceWith(storage)
    act(() => firstVisit.result.current.chooseMode('light'))
    act(() => firstVisit.result.current.chooseTheme('rose'))
    firstVisit.unmount()

    const { result } = chooseAppearanceWith(storage)

    expect([result.current.mode, result.current.theme]).toEqual(['light', 'rose'])
  })

  it('still switches the appearance when storage is blocked', () => {
    const { result } = chooseAppearanceWith(blockedStorage)

    act(() => {
      result.current.chooseMode('light')
      result.current.chooseTheme('rose')
    })

    expect([page.classList.contains('dark'), page.dataset.theme]).toEqual([false, 'rose'])
  })

  it('shows light when the device cannot report its preference and System is chosen', () => {
    vi.stubGlobal('matchMedia', undefined)
    const { result } = chooseAppearanceWith(inMemoryStorage())

    act(() => result.current.chooseMode('system'))

    expect(page.classList.contains('dark')).toBe(false)
  })
})
