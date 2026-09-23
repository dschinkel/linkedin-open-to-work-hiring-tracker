/** Light, Dark, or System (follow the device's prefers-color-scheme). */
export type AppearanceMode = 'light' | 'dark' | 'system'

/** The accent palette the tracker is painted in. Signal colors (Open to Work, Hiring, Removed) never change. */
export type ColorTheme = 'neutral' | 'ocean' | 'green'

export interface ColorThemeOption {
  value: ColorTheme
  label: string
  /** The theme's primary color, shown as a swatch before the theme is chosen. */
  swatch: string
}

export const defaultAppearanceMode: AppearanceMode = 'dark'
export const defaultColorTheme: ColorTheme = 'ocean'

const appearanceModes: readonly AppearanceMode[] = ['light', 'dark', 'system']

/** Green leans yellow-green and violet is left out, so neither blurs into the Open to Work and Hiring signal colors. */
export const colorThemeOptions: ColorThemeOption[] = [
  { value: 'neutral', label: 'Neutral', swatch: 'oklch(0.45 0 0)' },
  { value: 'ocean', label: 'Ocean', swatch: 'oklch(0.55 0.16 250)' },
  { value: 'green', label: 'Green', swatch: 'oklch(0.62 0.17 130)' },
]

export function isAppearanceMode(value: unknown): value is AppearanceMode {
  return appearanceModes.includes(value as AppearanceMode)
}

export function isColorTheme(value: unknown): value is ColorTheme {
  return colorThemeOptions.some((option) => option.value === value)
}

export function showsDark(mode: AppearanceMode, devicePrefersDark: boolean): boolean {
  if (mode === 'system') return devicePrefersDark
  return mode === 'dark'
}

export function swatchOf(theme: ColorTheme): string {
  return colorThemeOptions.find((option) => option.value === theme)?.swatch ?? ''
}
