import { useEffect, useState, useSyncExternalStore } from 'react'
import type { IconOption } from '@/components/ChoiceRow'
import { colorThemeOptions, showsDark, type AppearanceMode, type ColorTheme, type ColorThemeOption } from './appearance'
import { appearanceRepository, type AppearanceRepository } from './AppearanceRepository'
import { appearanceModeOptions } from './appearanceModeOptions'
import { devicePrefersDark, showAppearance, watchDeviceColorScheme } from './pageAppearance'

export interface ChooseAppearance {
  mode: AppearanceMode
  modeOptions: IconOption<AppearanceMode>[]
  theme: ColorTheme
  themeOptions: ColorThemeOption[]
  chooseMode: (mode: AppearanceMode) => void
  chooseTheme: (theme: ColorTheme) => void
  previewMode: (mode: AppearanceMode | null) => void
  previewTheme: (theme: ColorTheme | null) => void
}

export function useChooseAppearance(repository: AppearanceRepository = appearanceRepository): ChooseAppearance {
  const [mode, setMode] = useState(repository.loadMode)
  const [theme, setTheme] = useState(repository.loadTheme)
  const [modeOnTrial, previewMode] = useState<AppearanceMode | null>(null)
  const [themeOnTrial, previewTheme] = useState<ColorTheme | null>(null)
  const isDark = showsDark(modeOnTrial ?? mode, useDevicePrefersDark())
  const shownTheme = themeOnTrial ?? theme

  useEffect(() => showAppearance(isDark, shownTheme), [isDark, shownTheme])

  return {
    mode,
    modeOptions: appearanceModeOptions,
    theme,
    themeOptions: colorThemeOptions,
    chooseMode: (next) => {
      setMode(next)
      previewMode(null)
      repository.saveMode(next)
    },
    chooseTheme: (next) => {
      setTheme(next)
      previewTheme(null)
      repository.saveTheme(next)
    },
    previewMode,
    previewTheme,
  }
}

function useDevicePrefersDark(): boolean {
  return useSyncExternalStore(watchDeviceColorScheme, devicePrefersDark)
}
