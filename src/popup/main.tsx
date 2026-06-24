import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles/app.css'
import { DEFAULT_SETTINGS } from '../shared/constants'
import {
  addHistory,
  clearHistory,
  loadHistory,
  loadSettings,
  saveSettings,
  takePendingSelection
} from '../shared/storage'
import { applyTheme } from '../shared/theme'
import { makeFormatRows, parseTimeInput } from '../shared/time'
import type { HistoryItem, Settings, ViewName } from '../shared/types'
import { CommandPalette } from './components/CommandPalette'
import { ConvertView, type ResultMode } from './components/ConvertView'
import { Header } from './components/Header'
import { RecentView } from './components/RecentView'
import { SettingsView } from './components/SettingsView'
import { Toast } from './components/Toast'

interface ToastState {
  id: number
  message: string
}

function PopupApp() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [view, setView] = useState<ViewName>('convert')
  const [input, setInput] = useState('')
  const [resultMode, setResultMode] = useState<ResultMode>('live')
  const [now, setNow] = useState(() => new Date())
  const [pausedLiveDate, setPausedLiveDate] = useState<Date | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [commandOpen, setCommandOpen] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastParsedHistoryKey = useRef<string | null>(null)
  const toastCounter = useRef(0)
  const settingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestSettingsRef = useRef(settings)
  const hasScheduledSettingsSave = useRef(false)
  const hasHydratedSettings = useRef(false)

  const parsed = useMemo(() => parseTimeInput(input), [input])
  const hasInput = input.trim().length > 0
  const liveDate = pausedLiveDate ?? now
  const activeDate = resultMode === 'parse' && parsed ? parsed.date : liveDate
  const rows = useMemo(
    () => makeFormatRows(activeDate, settings.timezone),
    [activeDate, settings.timezone]
  )
  const recordHistory = useCallback(
    async (source: string, summary: string) => {
      await addHistory({
        source,
        summary,
        timezone: settings.timezone
      })
      setHistory(await loadHistory())
    },
    [settings.timezone]
  )

  useEffect(() => {
    void loadSettings().then((loaded) => {
      setSettings(loaded)
      setSettingsLoaded(true)
      applyTheme(loaded.theme)
    })
    void loadHistory().then(setHistory)
    void takePendingSelection().then((selection) => {
      if (selection) {
        setInput(selection)
        setResultMode('parse')
        setPausedLiveDate(null)
      }
    })
  }, [])

  useEffect(() => {
    if (!hasInput) setResultMode('live')
  }, [hasInput])

  useEffect(() => {
    latestSettingsRef.current = settings
  }, [settings])

  useEffect(() => {
    return () => {
      if (!settingsLoaded || !hasScheduledSettingsSave.current) return
      if (settingsTimer.current) {
        clearTimeout(settingsTimer.current)
        settingsTimer.current = null
      }
      void saveSettings(latestSettingsRef.current)
    }
  }, [settingsLoaded])

  useEffect(() => {
    if (!settingsLoaded) return
    if (!hasHydratedSettings.current) {
      hasHydratedSettings.current = true
      return
    }
    applyTheme(settings.theme)
    if (settingsTimer.current) clearTimeout(settingsTimer.current)
    hasScheduledSettingsSave.current = true
    settingsTimer.current = setTimeout(() => {
      hasScheduledSettingsSave.current = false
      void saveSettings(settings).then(() => {
        showToast('设置已保存')
      })
    }, 300)
    return () => {
      if (settingsTimer.current) clearTimeout(settingsTimer.current)
    }
  }, [settings, settingsLoaded])

  useEffect(() => {
    if (pausedLiveDate) return
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [pausedLiveDate])

  useEffect(() => {
    if (settings.focusInputOnOpen && view === 'convert') {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [settings.focusInputOnOpen, view])

  useEffect(() => {
    if (!settings.autoReadClipboard) return
    void maybeReadClipboard()
  }, [settings.autoReadClipboard])

  useEffect(() => {
    if (!settingsLoaded || !settings.historyEnabled || resultMode !== 'parse' || !parsed) return

    const historyKey = `${parsed.source}\n${settings.timezone}`
    if (lastParsedHistoryKey.current === historyKey) return
    lastParsedHistoryKey.current = historyKey

    void recordHistory(parsed.source, makeFormatRows(parsed.date, settings.timezone)[2].value)
  }, [
    parsed,
    recordHistory,
    resultMode,
    settings.historyEnabled,
    settings.timezone,
    settingsLoaded
  ])

  useEffect(() => {
    if (view === 'recent') void loadHistory().then(setHistory)
  }, [view])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen(true)
      }
      if (event.key === 'Escape') {
        if (commandOpen) setCommandOpen(false)
        else setView('convert')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [commandOpen])

  async function maybeReadClipboard() {
    try {
      const text = await navigator.clipboard.readText()
      if (parseTimeInput(text) !== null) {
        setInput(text.trim())
        setResultMode('parse')
        setPausedLiveDate(null)
        showToast('已读取剪贴板')
        window.requestAnimationFrame(() => {
          inputRef.current?.focus()
          inputRef.current?.select()
        })
      }
    } catch {
      // The toggle requests permission when enabled; this covers browsers that still deny reads.
    }
  }

  function showToast(message: string) {
    const id = ++toastCounter.current
    setToast({ id, message })
    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current))
    }, 1800)
  }

  async function copyValue(value: string, label = '结果') {
    try {
      await navigator.clipboard.writeText(value)
      showToast(`已复制：${label}`)
    } catch {
      showToast('复制失败，请重试')
    }
  }

  async function updateSettings(next: Settings) {
    if (
      next.autoReadClipboard &&
      !settings.autoReadClipboard &&
      typeof chrome !== 'undefined' &&
      chrome.permissions
    ) {
      const granted = await chrome.permissions.request({ permissions: ['clipboardRead'] })
      if (!granted) next = { ...next, autoReadClipboard: false }
    }
    setSettings(next)
  }

  return (
    <div className="popup-shell">
      <Header view={view} setView={setView} openCommand={() => setCommandOpen(true)} />
      {view === 'convert' && (
        <ConvertView
          input={input}
          inputRef={inputRef}
          setInput={(value) => {
            setInput(value)
            if (value.trim()) {
              setResultMode('parse')
              setPausedLiveDate(null)
            }
          }}
          settings={settings}
          setSettings={updateSettings}
          parsed={parsed}
          resultMode={resultMode}
          setResultMode={setResultMode}
          liveDate={liveDate}
          isLivePaused={Boolean(pausedLiveDate)}
          toggleLivePaused={() => {
            if (pausedLiveDate) {
              setPausedLiveDate(null)
              setNow(new Date())
              return
            }
            const snapshot = new Date()
            setNow(snapshot)
            setPausedLiveDate(snapshot)
          }}
          copyValue={copyValue}
        />
      )}
      {view === 'recent' && (
        <RecentView
          history={history}
          restore={(value) => {
            setInput(value)
            setResultMode('parse')
            setPausedLiveDate(null)
            setView('convert')
          }}
          copyValue={copyValue}
          clear={async () => {
            await clearHistory()
            setHistory([])
          }}
        />
      )}
      {view === 'settings' && <SettingsView settings={settings} setSettings={updateSettings} />}
      {commandOpen && (
        <CommandPalette
          rows={rows}
          history={history}
          setView={setView}
          setInput={(value) => {
            setInput(value)
            setResultMode('parse')
            setPausedLiveDate(null)
          }}
          copyValue={copyValue}
          close={() => setCommandOpen(false)}
        />
      )}
      {toast && <Toast message={toast.message} />}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<PopupApp />)
