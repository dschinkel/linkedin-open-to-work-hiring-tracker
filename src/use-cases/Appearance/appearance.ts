export type AppearanceMode = 'light' | 'dark' | 'system'

export type ColorTheme = 'neutral' | 'ocean' | 'aqua' | 'green' | 'brown' | 'orange' | 'red'

export interface ColorThemeOption {
  value: ColorTheme
  label: string
  swatch: string
}

export const defaultAppearanceMode: AppearanceMode = 'dark'
export const defaultColorTheme: ColorTheme = 'neutral'

const appearanceModes: readonly AppearanceMode[] = ['light', 'dark', 'system']

export const colorThemeOptions: ColorThemeOption[] = [
  { value: 'neutral', label: 'Neutral', swatch: 'oklch(0.45 0 0)' },
  { value: 'ocean', label: 'Ocean', swatch: 'oklch(0.55 0.16 250)' },
  { value: 'aqua', label: 'Aqua', swatch: '#1fb8c0' },
  { value: 'green', label: 'Green', swatch: 'oklch(0.72 0.2 133)' },
  { value: 'brown', label: 'Brown', swatch: '#8b5a2b' },
  { value: 'orange', label: 'Orange', swatch: '#ff9a3d' },
  { value: 'red', label: 'Red', swatch: '#e53945' },
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

