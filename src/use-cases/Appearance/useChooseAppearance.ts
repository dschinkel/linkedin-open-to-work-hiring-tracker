import { useEffect, useState, useSyncExternalStore } from 'react'
import type { IconOption } from '@/components/IconChoiceSelect'
import { colorThemeOptions, showsDark, swatchOf, type AppearanceMode, type ColorTheme, type ColorThemeOption } from './appearance'
import { appearanceRepository, type AppearanceRepository } from './AppearanceRepository'
import { appearanceModeOptions, modeOptionFor } from './appearanceModeOptions'
import { devicePrefersDark, showAppearance, watchDeviceColorScheme } from './pageAppearance'

export interface ChooseAppearance {
  mode: AppearanceMode
  modeOptions: IconOption<AppearanceMode>[]
  modeIcon: IconOption<AppearanceMode>['icon']
  modeLabel: string
  theme: ColorTheme
  themeOptions: ColorThemeOption[]
  themeSwatch: string
  chooseMode: (mode: AppearanceMode) => void
  chooseTheme: (theme: ColorTheme) => void
}

/** Light/Dark/System plus a color theme, remembered per viewer and painted onto the page. */
export function useChooseAppearance(repository: AppearanceRepository = appearanceRepository): ChooseAppearance {
  const [mode, setMode] = useState(repository.loadMode)
  const [theme, setTheme] = useState(repository.loadTheme)
  const isDark = showsDark(mode, useDevicePrefersDark())

  useEffect(() => showAppearance(isDark, theme), [isDark, theme])

  return {
    mode,
    modeOptions: appearanceModeOptions,
    modeIcon: modeOptionFor(mode).icon,
    modeLabel: `Appearance: ${modeOptionFor(mode).label}`,
    theme,
    themeOptions: colorThemeOptions,
    themeSwatch: swatchOf(theme),
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
