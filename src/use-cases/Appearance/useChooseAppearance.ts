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
}

export function useChooseAppearance(repository: AppearanceRepository = appearanceRepository): ChooseAppearance {
  const [mode, setMode] = useState(repository.loadMode)
  const [theme, setTheme] = useState(repository.loadTheme)
  const isDark = showsDark(mode, useDevicePrefersDark())

  useEffect(() => showAppearance(isDark, theme), [isDark, theme])

  return {
    mode,
    modeOptions: appearanceModeOptions,
    theme,
    themeOptions: colorThemeOptions,
    chooseMode: (next) => {
      setMode(next)
      repository.saveMode(next)
    },
    chooseTheme: (next) => {
      setTheme(next)
      repository.saveTheme(next)
    },
  }
}

function useDevicePrefersDark(): boolean {
  return useSyncExternalStore(watchDeviceColorScheme, devicePrefersDark)
}
