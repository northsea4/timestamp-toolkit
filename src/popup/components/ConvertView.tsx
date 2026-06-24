import clsx from 'clsx'
import { AlertTriangle, Globe2, Pause, Play, Search, X } from 'lucide-react'
import type { RefObject } from 'react'
import { TIMEZONES } from '../../shared/constants'
import { makeFormatRows, timestampUnitLabel } from '../../shared/time'
import type { ParseResult, Settings } from '../../shared/types'
import { FormatLine } from './FormatLine'
import styles from './ConvertView.module.css'

export type ResultMode = 'live' | 'parse'

export function ConvertView({
  input,
  inputRef,
  setInput,
  settings,
  setSettings,
  parsed,
  resultMode,
  setResultMode,
  liveDate,
  isLivePaused,
  toggleLivePaused,
  copyValue
}: {
  input: string
  inputRef: RefObject<HTMLInputElement | null>
  setInput: (value: string) => void
  settings: Settings
  setSettings: (settings: Settings) => Promise<void>
  parsed: ParseResult | null
  resultMode: ResultMode
  setResultMode: (mode: ResultMode) => void
  liveDate: Date
  isLivePaused: boolean
  toggleLivePaused: () => void
  copyValue: (value: string, label?: string) => Promise<void>
}) {
  const trimmedInput = input.trim()
  const hasInput = trimmedInput.length > 0
  const isParseMode = resultMode === 'parse'
  const isError = isParseMode && hasInput && !parsed
  const displayedDate = isParseMode && parsed ? parsed.date : liveDate
  const rows = makeFormatRows(displayedDate, settings.timezone).slice(0, 8)
  const timezoneLabel =
    TIMEZONES.find((timezone) => timezone.id === settings.timezone)?.label ?? settings.timezone
  const title = isError ? '无法解析' : isParseMode && parsed ? '解析结果' : '实时结果'
  const meta = isError
    ? '输入不是可识别的时间'
    : isParseMode && parsed
      ? `来自 ${parsed.source} · ${timestampUnitLabel(parsed.unit)}`
      : isLivePaused
        ? '已暂停'
        : '当前时间，持续更新'

  const viewClass = isError
    ? styles.view
    : isParseMode && parsed
      ? clsx(styles.view, styles.parseActive)
      : styles.view

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

  const cardClass = isError
    ? styles.inputError
    : resultMode === 'live' && hasInput
      ? styles.inputMuted
      : styles.inputCard

  const panelClass = isError
    ? styles.resultPanelError
    : isParseMode && parsed
      ? styles.resultPanelParse
      : styles.resultPanelLive

  const variant = isParseMode ? 'parse' : 'live'

  return (
    <main className={viewClass}>
      <section className={cardClass}>
        <div className={styles.smartInputRow}>
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
            <button className={styles.clearButton} type="button" onClick={clearInput} title="清空">
              <X size={16} />
            </button>
          )}
        </div>
        <div className={styles.inputMeta}>
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

      <section className={styles.toolbar}>
        <div className={clsx(styles.modeSwitch, isError && styles.modeSwitchError)}>
          <button
            className={clsx(resultMode === 'live' && styles.modeSwitchActive)}
            type="button"
            onClick={() => setResultMode('live')}>
            实时
          </button>
          <button
            className={clsx(resultMode === 'parse' && styles.modeSwitchActive)}
            type="button"
            onClick={switchToParse}>
            解析
          </button>
        </div>
        <div className={styles.resultHeading}>
          <strong>{title}</strong>
          <span>{meta}</span>
        </div>
        <div className={styles.resultActions}>
          {!isParseMode && (
            <button
              className={clsx(styles.livePauseButton, isLivePaused && styles.livePauseButtonActive)}
              type="button"
              title={isLivePaused ? '恢复实时更新' : '暂停实时结果'}
              aria-pressed={isLivePaused}
              onClick={toggleLivePaused}>
              {isLivePaused ? <Play size={15} /> : <Pause size={15} />}
            </button>
          )}
          <label className={styles.timezonePill}>
            <Globe2 size={14} />
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
        </div>
      </section>

      <section className={panelClass} aria-label="格式结果">
        {isError ? (
          <div className={styles.invalidState}>
            <AlertTriangle size={22} />
            <strong>无法解析</strong>
            <span>"{trimmedInput}" 不是可识别的时间戳或日期时间。</span>
            <button type="button" onClick={() => setResultMode('live')}>
              查看实时结果
            </button>
          </div>
        ) : (
          <div className={styles.formatList}>
            {rows.map((row) => (
              <FormatLine key={row.id} row={row} variant={variant} copyValue={copyValue} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
