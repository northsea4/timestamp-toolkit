import type { ThemeMode } from './types'

export function applyTheme(theme: ThemeMode): void {
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches
  const resolved = theme === 'system' ? (prefersLight ? 'light' : 'dark') : theme
  document.documentElement.dataset.theme = resolved
}
