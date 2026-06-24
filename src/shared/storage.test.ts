import { beforeEach, describe, expect, it } from 'vitest'
import { HISTORY_LIMIT } from './constants'
import {
  addHistory,
  clearHistory,
  loadHistory,
  loadSettings,
  saveHistory,
  saveSettings
} from './storage'

// localStorage mock
const store: Record<string, string> = {}

const localStorageMock: Storage = {
  get length() {
    return Object.keys(store).length
  },
  clear() {
    for (const key of Object.keys(store)) delete store[key]
  },
  getItem(key: string) {
    return store[key] ?? null
  },
  setItem(key: string, value: string) {
    store[key] = value
  },
  removeItem(key: string) {
    delete store[key]
  },
  key(index: number) {
    return Object.keys(store)[index] ?? null
  }
}

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })
// Ensure hasChromeStorage() returns false
Object.defineProperty(globalThis, 'chrome', { value: undefined, configurable: true })

beforeEach(() => {
  localStorageMock.clear()
})

describe('loadSettings', () => {
  it('returns default settings when nothing is stored', async () => {
    const settings = await loadSettings()
    expect(settings.theme).toBe('system')
    expect(settings.timezone).toBe('local')
    expect(settings.autoReadClipboard).toBe(false)
    expect(settings.focusInputOnOpen).toBe(true)
    expect(settings.historyEnabled).toBe(true)
  })

  it('merges stored settings with defaults', async () => {
    localStorage.setItem('settings', JSON.stringify({ theme: 'light' }))
    const settings = await loadSettings()
    expect(settings.theme).toBe('light')
    expect(settings.timezone).toBe('local') // default preserved
  })

  it('handles corrupted JSON gracefully', async () => {
    localStorage.setItem('settings', '{invalid json')
    const settings = await loadSettings()
    expect(settings.theme).toBe('system') // falls back to defaults
  })
})

describe('saveSettings', () => {
  it('saves settings to localStorage', async () => {
    const settings = {
      theme: 'light' as const,
      timezone: 'Asia/Tokyo',
      autoReadClipboard: false,
      focusInputOnOpen: false,
      historyEnabled: false
    }
    await saveSettings(settings)
    const stored = JSON.parse(localStorage.getItem('settings')!)
    expect(stored.theme).toBe('light')
    expect(stored.timezone).toBe('Asia/Tokyo')
  })
})

describe('loadHistory', () => {
  it('returns empty array when nothing is stored', async () => {
    const history = await loadHistory()
    expect(history).toEqual([])
  })

  it('returns stored history items', async () => {
    const items = [
      { id: '1', source: '1700000000', summary: '2023-11-14', timezone: 'UTC', createdAt: 1000 }
    ]
    localStorage.setItem('history', JSON.stringify(items))
    const history = await loadHistory()
    expect(history).toHaveLength(1)
    expect(history[0].source).toBe('1700000000')
  })

  it('handles corrupted JSON gracefully', async () => {
    localStorage.setItem('history', 'not valid json')
    const history = await loadHistory()
    expect(history).toEqual([])
  })

  it('returns empty array for non-array JSON payload', async () => {
    localStorage.setItem('history', JSON.stringify({ foo: 'bar' }))
    const history = await loadHistory()
    expect(history).toEqual([])
  })
})

describe('addHistory', () => {
  it('adds an item to history', async () => {
    await addHistory({ source: '1700000000', summary: '2023-11-14', timezone: 'UTC' })
    const history = await loadHistory()
    expect(history).toHaveLength(1)
    expect(history[0].source).toBe('1700000000')
    expect(history[0].id).toBeTruthy()
    expect(history[0].createdAt).toBeGreaterThan(0)
  })

  it('deduplicates by source and timezone', async () => {
    await addHistory({ source: '1700000000', summary: 'first', timezone: 'UTC' })
    await addHistory({ source: '1700000000', summary: 'second', timezone: 'UTC' })
    const history = await loadHistory()
    expect(history).toHaveLength(1)
    expect(history[0].summary).toBe('second') // latest wins
  })

  it('keeps different timezones as separate entries', async () => {
    await addHistory({ source: '1700000000', summary: 'a', timezone: 'UTC' })
    await addHistory({ source: '1700000000', summary: 'b', timezone: 'Asia/Tokyo' })
    const history = await loadHistory()
    expect(history).toHaveLength(2)
  })

  it('respects the history limit', async () => {
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
      await addHistory({ source: `source-${i}`, summary: `item ${i}`, timezone: 'UTC' })
    }
    const history = await loadHistory()
    expect(history).toHaveLength(HISTORY_LIMIT)
    expect(history[0].source).toBe(`source-${HISTORY_LIMIT + 4}`) // most recent first
  })
})

describe('clearHistory', () => {
  it('clears all history items', async () => {
    await addHistory({ source: '1700000000', summary: 'test', timezone: 'UTC' })
    await clearHistory()
    const history = await loadHistory()
    expect(history).toEqual([])
  })
})

describe('saveHistory', () => {
  it('saves a history array directly', async () => {
    const items = [
      { id: '1', source: 'a', summary: 'b', timezone: 'UTC', createdAt: 1 },
      { id: '2', source: 'c', summary: 'd', timezone: 'UTC', createdAt: 2 }
    ]
    await saveHistory(items)
    const loaded = await loadHistory()
    expect(loaded).toHaveLength(2)
  })
})
