/** Light, Dark, or System (follow the device's prefers-color-scheme). */
export type AppearanceMode = 'light' | 'dark' | 'system'

/** The accent palette the tracker is painted in. Signal colors (Open to Work, Hiring, Removed) never change. */
export type ColorTheme = 'yellow' | 'neutral' | 'ocean' | 'teal' | 'sunset' | 'rose'

export interface ColorThemeOption {
  value: ColorTheme
  label: string
  /** The theme's primary color, shown as a swatch before the theme is chosen. */
  swatch: string
}

export const defaultAppearanceMode: AppearanceMode = 'dark'
export const defaultColorTheme: ColorTheme = 'yellow'

const appearanceModes: readonly AppearanceMode[] = ['light', 'dark', 'system']

/** Green and violet palettes are left out on purpose: they would blur into the Open to Work and Hiring signal colors. */
export const colorThemeOptions: ColorThemeOption[] = [
  { value: 'yellow', label: 'Yellow', swatch: 'oklch(0.8 0.16 85)' },
  { value: 'neutral', label: 'Neutral', swatch: 'oklch(0.45 0 0)' },
  { value: 'ocean', label: 'Ocean', swatch: 'oklch(0.55 0.16 250)' },
  { value: 'teal', label: 'Teal', swatch: 'oklch(0.6 0.11 200)' },
  { value: 'sunset', label: 'Sunset', swatch: 'oklch(0.65 0.18 45)' },
  { value: 'rose', label: 'Rose', swatch: 'oklch(0.6 0.2 5)' },
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
