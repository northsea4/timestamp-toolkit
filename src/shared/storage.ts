import { DEFAULT_SETTINGS, HISTORY_LIMIT } from './constants'
import type { HistoryItem, Settings } from './types'

const SETTINGS_KEY = 'settings'
const HISTORY_KEY = 'history'
const PENDING_SELECTION_KEY = 'pendingSelection'

function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage)
}

export async function loadSettings(): Promise<Settings> {
  if (!hasChromeStorage()) {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
    } catch {
      return DEFAULT_SETTINGS
    }
  }

  const result = await chrome.storage.sync.get(SETTINGS_KEY)
  const stored = result[SETTINGS_KEY]
  if (stored && typeof stored === 'object') {
    return { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) }
  }

  return DEFAULT_SETTINGS
}

export async function saveSettings(settings: Settings): Promise<void> {
  if (!hasChromeStorage()) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    return
  }

  await chrome.storage.sync.set({ [SETTINGS_KEY]: settings })
}

export async function loadHistory(): Promise<HistoryItem[]> {
  if (!hasChromeStorage()) {
    try {
      const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
      return Array.isArray(parsed) ? (parsed as HistoryItem[]) : []
    } catch {
      return []
    }
  }

  const result = await chrome.storage.local.get(HISTORY_KEY)
  return Array.isArray(result[HISTORY_KEY]) ? (result[HISTORY_KEY] as HistoryItem[]) : []
}

export async function addHistory(item: Omit<HistoryItem, 'id' | 'createdAt'>): Promise<void> {
  const history = await loadHistory()
  const next: HistoryItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: Date.now()
  }

  const deduped = history.filter(
    (entry) => entry.source !== item.source || entry.timezone !== item.timezone
  )
  await saveHistory([next, ...deduped].slice(0, HISTORY_LIMIT))
}

export async function saveHistory(history: HistoryItem[]): Promise<void> {
  if (!hasChromeStorage()) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
    return
  }

  await chrome.storage.local.set({ [HISTORY_KEY]: history })
}

export async function clearHistory(): Promise<void> {
  await saveHistory([])
}

export async function takePendingSelection(): Promise<string | null> {
  if (!hasChromeStorage()) return null

  const result = await chrome.storage.local.get(PENDING_SELECTION_KEY)
  const value = result[PENDING_SELECTION_KEY] as string | undefined
  if (value) await chrome.storage.local.remove(PENDING_SELECTION_KEY)
  return value ?? null
}

export async function setPendingSelection(value: string): Promise<void> {
  if (!hasChromeStorage()) return
  await chrome.storage.local.set({ [PENDING_SELECTION_KEY]: value })
}
