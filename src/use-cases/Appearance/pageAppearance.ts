import type { ColorTheme } from './appearance'

const darkSchemeQuery = '(prefers-color-scheme: dark)'

export function showAppearance(isDark: boolean, theme: ColorTheme): void {
  const page = document.documentElement
  page.classList.toggle('dark', isDark)
  page.setAttribute('data-theme', theme)
}

export function devicePrefersDark(): boolean {
  try {
    return window.matchMedia(darkSchemeQuery).matches
  } catch {
    return false
  }
}

export function watchDeviceColorScheme(onChange: () => void): () => void {
  try {
    const query = window.matchMedia(darkSchemeQuery)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  } catch {
    return () => {}
  }
}
