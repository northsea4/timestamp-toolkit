import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  AlertTriangle,
  Command,
  Copy,
  History,
  Home,
  Search,
  Settings as SettingsIcon,
  Trash2,
  X
} from 'lucide-react'
import '../styles/app.css'
import { DEFAULT_SETTINGS, TIMEZONES } from '../shared/constants'
import {
  addHistory,
  clearHistory,
  loadHistory,
  loadSettings,
  saveSettings,
  takePendingSelection
} from '../shared/storage'
import { applyTheme } from '../shared/theme'
import { makeFormatRows, parseTimeInput, timestampUnitLabel } from '../shared/time'
import type { FormatRow, HistoryItem, ParseResult, Settings, ViewName } from '../shared/types'

type ResultMode = 'live' | 'parse'

interface ToastState {
  id: number
  message: string
}

function PopupApp() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [view, setView] = useState<ViewName>('convert')
  const [input, setInput] = useState('')
  const [resultMode, setResultMode] = useState<ResultMode>('live')
  const [now, setNow] = useState(() => new Date())
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [commandOpen, setCommandOpen] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const parsed = useMemo(() => parseTimeInput(input), [input])
  const hasInput = input.trim().length > 0
  const activeDate = resultMode === 'parse' && parsed ? parsed.date : now
  const rows = useMemo(
    () => makeFormatRows(activeDate, settings.timezone),
    [activeDate, settings.timezone]
  )

  useEffect(() => {
    void loadSettings().then((loaded) => {
      setSettings(loaded)
      applyTheme(loaded.theme)
    })
    void loadHistory().then(setHistory)
    void takePendingSelection().then((selection) => {
      if (selection) {
        setInput(selection)
        setResultMode('parse')
      }
    })
  }, [])

  useEffect(() => {
    if (!hasInput) setResultMode('live')
  }, [hasInput])

  useEffect(() => {
    applyTheme(settings.theme)
    void saveSettings(settings)
  }, [settings])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

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
      if (parseTimeInput(text)) {
        setInput(text.trim())
        setResultMode('parse')
      }
    } catch {
      // The toggle requests permission when enabled; this covers browsers that still deny reads.
    }
  }

  function showToast(message: string) {
    const nextToast = { id: Date.now(), message }
    setToast(nextToast)
    window.setTimeout(() => {
      setToast((current) => (current?.id === nextToast.id ? null : current))
    }, 2600)
  }

  async function copyValue(value: string, label = '结果', source = input || value) {
    try {
      await navigator.clipboard.writeText(value)
      showToast(`已复制：${label}`)
    } catch {
      showToast('复制失败，请重试')
      return
    }

    if (settings.historyEnabled) {
      await addHistory({
        source,
        summary: value,
        timezone: settings.timezone
      })
      setHistory(await loadHistory())
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
            if (value.trim()) setResultMode('parse')
          }}
          settings={settings}
          setSettings={updateSettings}
          parsed={parsed}
          resultMode={resultMode}
          setResultMode={setResultMode}
          now={now}
          copyValue={copyValue}
        />
      )}
      {view === 'recent' && (
        <RecentView
          history={history}
          restore={(value) => {
            setInput(value)
            setResultMode('parse')
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
          }}
          copyValue={copyValue}
          close={() => setCommandOpen(false)}
        />
      )}
      {toast && <div className="toast">{toast.message}</div>}
    </div>
  )
}

function Header({
  view,
  setView,
  openCommand
}: {
  view: ViewName
  setView: (view: ViewName) => void
  openCommand: () => void
}) {
  return (
    <header className="app-header">
      <button className="brand-button" onClick={() => setView('convert')} type="button">
        <span className="brand-mark">T</span>
        <span>
          <strong>时间工具箱</strong>
          <small>{view === 'convert' ? '转换' : view === 'recent' ? '历史' : '设置'}</small>
        </span>
      </button>
      <div className="header-actions">
        <IconButton title="主界面" active={view === 'convert'} onClick={() => setView('convert')}>
          <Home size={16} />
        </IconButton>
        <IconButton title="命令" onClick={openCommand}>
          <Command size={16} />
        </IconButton>
        <IconButton title="历史" active={view === 'recent'} onClick={() => setView('recent')}>
          <History size={16} />
        </IconButton>
        <IconButton title="设置" active={view === 'settings'} onClick={() => setView('settings')}>
          <SettingsIcon size={16} />
        </IconButton>
      </div>
    </header>
  )
}

function ConvertView({
  input,
  inputRef,
  setInput,
  settings,
  setSettings,
  parsed,
  resultMode,
  setResultMode,
  now,
  copyValue
}: {
  input: string
  inputRef: React.RefObject<HTMLInputElement | null>
  setInput: (value: string) => void
  settings: Settings
  setSettings: (settings: Settings) => Promise<void>
  parsed: ParseResult | null
  resultMode: ResultMode
  setResultMode: (mode: ResultMode) => void
  now: Date
  copyValue: (value: string, label?: string, source?: string) => Promise<void>
}) {
  const trimmedInput = input.trim()
  const hasInput = trimmedInput.length > 0
  const isParseMode = resultMode === 'parse'
  const isError = isParseMode && hasInput && !parsed
  const displayedDate = isParseMode && parsed ? parsed.date : now
  const rows = makeFormatRows(displayedDate, settings.timezone).slice(0, 8)
  const timezoneLabel =
    TIMEZONES.find((timezone) => timezone.id === settings.timezone)?.label ?? settings.timezone
  const title = isError ? '无法解析' : isParseMode && parsed ? '解析结果' : '实时结果'
  const meta = isError
    ? '输入不是可识别的时间'
    : isParseMode && parsed
      ? `来自 ${parsed.source} · ${timestampUnitLabel(parsed.unit)}`
      : '当前时间，持续更新'

  function focusParseInput() {
    inputRef.current?.focus()
    if (hasInput) setResultMode('parse')
  }

  function clearInput() {
    setInput('')
    setResultMode('live')
  }

  function switchToParse() {
    if (!hasInput) {
      inputRef.current?.focus()
      return
    }
    setResultMode('parse')
  }

  return (
    <main
      className={
        isError
          ? 'convert-view parse-error'
          : isParseMode && parsed
            ? 'convert-view parse-active'
            : 'convert-view live-active'
      }>
      <section
        className={
          resultMode === 'live' && hasInput
            ? 'input-card input-muted'
            : isError
              ? 'input-card input-error'
              : 'input-card'
        }>
        <div className="smart-input-row">
          <Search size={18} />
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onFocus={focusParseInput}
            placeholder="输入时间戳或日期时间"
            spellCheck={false}
          />
          {input && (
            <button className="clear-button" type="button" onClick={clearInput} title="清空">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="input-meta">
          <span>
            {!hasInput
              ? '支持秒/毫秒/微秒/纳秒与日期时间'
              : parsed
                ? `识别为 ${timestampUnitLabel(parsed.unit)}`
                : '无法识别为时间戳或日期时间'}
          </span>
          {resultMode === 'live' && hasInput && <span>输入已保留，当前查看实时</span>}
        </div>
      </section>

      <section className="result-toolbar">
        <div className={isError ? 'mode-switch error' : 'mode-switch'}>
          <button
            className={resultMode === 'live' ? 'active' : ''}
            type="button"
            onClick={() => setResultMode('live')}>
            实时
          </button>
          <button
            className={resultMode === 'parse' ? 'active' : ''}
            type="button"
            onClick={switchToParse}>
            解析
          </button>
        </div>
        <div className="result-heading">
          <strong>{title}</strong>
          <span>{meta}</span>
        </div>
        <label className="timezone-pill">
          <span>{timezoneLabel}</span>
          <select
            value={settings.timezone}
            onChange={(event) => void setSettings({ ...settings, timezone: event.target.value })}>
            {TIMEZONES.map((timezone) => (
              <option key={timezone.id} value={timezone.id}>
                {timezone.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section
        className={
          isError
            ? 'result-panel error'
            : isParseMode && parsed
              ? 'result-panel parse'
              : 'result-panel live'
        }
        aria-label="格式结果">
        {isError ? (
          <InvalidInput input={trimmedInput} showLive={() => setResultMode('live')} />
        ) : (
          <div className="format-list">
            {rows.map((row) => (
              <FormatLine key={row.id} row={row} copyValue={copyValue} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function InvalidInput({ input, showLive }: { input: string; showLive: () => void }) {
  return (
    <div className="invalid-state">
      <AlertTriangle size={22} />
      <strong>无法解析</strong>
      <span>“{input}” 不是可识别的时间戳或日期时间。</span>
      <button type="button" onClick={showLive}>
        查看实时结果
      </button>
    </div>
  )
}

function FormatLine({
  row,
  copyValue
}: {
  row: FormatRow
  copyValue: (value: string, label?: string) => Promise<void>
}) {
  return (
    <div className={row.primary ? 'format-line primary' : 'format-line'}>
      <span className="format-label">{row.label}</span>
      <span className="format-value">{row.value}</span>
      <button
        className="copy-button"
        type="button"
        title={`复制${row.label}`}
        onClick={() => void copyValue(row.value, row.label)}>
        <Copy size={15} />
      </button>
    </div>
  )
}

function RecentView({
  history,
  restore,
  copyValue,
  clear
}: {
  history: HistoryItem[]
  restore: (value: string) => void
  copyValue: (value: string, label?: string) => Promise<void>
  clear: () => Promise<void>
}) {
  return (
    <main className="panel-view">
      <div className="panel-title">
        <span>最近 30 条</span>
        <IconButton title="清空历史" onClick={() => void clear()}>
          <Trash2 size={15} />
        </IconButton>
      </div>
      <div className="recent-list">
        {history.length === 0 && <div className="empty-state">暂无历史记录</div>}
        {history.map((item) => (
          <div className="recent-item" key={item.id}>
            <button type="button" onClick={() => restore(item.source)}>
              <strong>{item.source}</strong>
              <span>{item.summary}</span>
            </button>
            <IconButton title="复制结果" onClick={() => void copyValue(item.summary, '历史结果')}>
              <Copy size={15} />
            </IconButton>
          </div>
        ))}
      </div>
    </main>
  )
}

function SettingsView({
  settings,
  setSettings
}: {
  settings: Settings
  setSettings: (settings: Settings) => Promise<void>
}) {
  return (
    <main className="panel-view">
      <div className="panel-title">设置</div>
      <div className="settings-list">
        <SettingSelect
          label="主题"
          value={settings.theme}
          onChange={(theme) => void setSettings({ ...settings, theme: theme as Settings['theme'] })}
          options={[
            ['system', '跟随系统'],
            ['dark', '深色'],
            ['light', '浅色']
          ]}
        />
        <SettingSelect
          label="默认时区"
          value={settings.timezone}
          onChange={(timezone) => void setSettings({ ...settings, timezone })}
          options={TIMEZONES.map((timezone) => [timezone.id, timezone.label])}
        />
        <SettingToggle
          label="打开时自动读取剪贴板"
          checked={settings.autoReadClipboard}
          onChange={(autoReadClipboard) => void setSettings({ ...settings, autoReadClipboard })}
        />
        <SettingToggle
          label="打开时聚焦输入框"
          checked={settings.focusInputOnOpen}
          onChange={(focusInputOnOpen) => void setSettings({ ...settings, focusInputOnOpen })}
        />
        <SettingToggle
          label="保存最近记录"
          checked={settings.historyEnabled}
          onChange={(historyEnabled) => void setSettings({ ...settings, historyEnabled })}
        />
      </div>
    </main>
  )
}

function CommandPalette({
  rows,
  history,
  setView,
  setInput,
  copyValue,
  close
}: {
  rows: FormatRow[]
  history: HistoryItem[]
  setView: (view: ViewName) => void
  setInput: (value: string) => void
  copyValue: (value: string, label?: string) => Promise<void>
  close: () => void
}) {
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLowerCase()
  const formatCommands = rows.map((row) => ({
    key: `format-${row.id}`,
    title: `复制 ${row.label}`,
    detail: row.value,
    action: async () => copyValue(row.value, row.label)
  }))
  const historyCommands = history.map((item) => ({
    key: `history-${item.id}`,
    title: `恢复 ${item.source}`,
    detail: item.summary,
    action: async () => {
      setInput(item.source)
      setView('convert')
    }
  }))
  const navCommands = [
    {
      key: 'nav-convert',
      title: '打开转换',
      detail: '返回主界面',
      action: async () => setView('convert')
    },
    {
      key: 'nav-recent',
      title: '打开历史',
      detail: '查看最近 30 条',
      action: async () => setView('recent')
    },
    {
      key: 'nav-settings',
      title: '打开设置',
      detail: '主题、时区、剪贴板',
      action: async () => setView('settings')
    }
  ]
  const commands = [...formatCommands, ...historyCommands, ...navCommands].filter((item) =>
    `${item.title} ${item.detail}`.toLowerCase().includes(normalized)
  )

  return (
    <div className="command-backdrop" onMouseDown={close}>
      <div className="command-box" onMouseDown={(event) => event.stopPropagation()}>
        <div className="command-input">
          <Search size={17} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索格式、历史或设置"
          />
        </div>
        <div className="command-results">
          {commands.slice(0, 8).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                void item.action().then(close)
              }}>
              <span>{item.title}</span>
              <small>{item.detail}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function SettingSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: string
  options: string[][]
  onChange: (value: string) => void
}) {
  return (
    <label className="setting-row">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </label>
  )
}

function SettingToggle({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="setting-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}

function IconButton({
  title,
  active,
  onClick,
  children
}: {
  title: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      className={active ? 'icon-button active' : 'icon-button'}
      type="button"
      title={title}
      onClick={onClick}>
      {children}
    </button>
  )
}

createRoot(document.getElementById('root')!).render(<PopupApp />)
