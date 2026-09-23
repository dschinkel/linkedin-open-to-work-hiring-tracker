import { defaultAppearanceMode, defaultColorTheme, isAppearanceMode, isColorTheme, type AppearanceMode, type ColorTheme } from './appearance'

/** Keep in sync with the pre-paint script in index.html, which reads the same keys before React loads. */
export const appearanceModeKey = 'tracker.appearanceMode'
export const colorThemeKey = 'tracker.colorTheme'

export interface AppearanceStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export interface AppearanceRepository {
  loadMode: () => AppearanceMode
  saveMode: (mode: AppearanceMode) => void
  loadTheme: () => ColorTheme
  saveTheme: (theme: ColorTheme) => void
}

/** Choices are remembered per viewer; when storage is unavailable (private mode, blocked) the defaults apply and nothing breaks. */
export function appearanceRepositoryFor(openStorage: () => AppearanceStorage): AppearanceRepository {
  return {
    loadMode: () => readChoice(openStorage, appearanceModeKey, isAppearanceMode, defaultAppearanceMode),
    saveMode: (mode) => writeChoice(openStorage, appearanceModeKey, mode),
    loadTheme: () => readChoice(openStorage, colorThemeKey, isColorTheme, defaultColorTheme),
    saveTheme: (theme) => writeChoice(openStorage, colorThemeKey, theme),
  }
}

export const appearanceRepository = appearanceRepositoryFor(() => window.localStorage)

function readChoice<Choice extends string>(openStorage: () => AppearanceStorage, key: string, isKnown: (value: unknown) => value is Choice, fallback: Choice): Choice {
  try {
    const stored = openStorage().getItem(key)
    return isKnown(stored) ? stored : fallback
  } catch {
    return fallback
  }
}

function writeChoice(openStorage: () => AppearanceStorage, key: string, value: string): void {
  try {
    openStorage().setItem(key, value)
  } catch {
    // Storage can be unavailable; the choice still applies for this visit.
  }
}
