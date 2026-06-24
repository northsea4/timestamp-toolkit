import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { FormatRow, HistoryItem, ViewName } from '../../shared/types'
import styles from './CommandPalette.module.css'

export function CommandPalette({
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

  const formatCommands = useMemo(
    () =>
      rows.map((row) => ({
        key: `format-${row.id}`,
        title: `复制 ${row.label}`,
        detail: row.value,
        action: async () => copyValue(row.value, row.label)
      })),
    [rows, copyValue]
  )

  const historyCommands = useMemo(
    () =>
      history.map((item) => ({
        key: `history-${item.id}`,
        title: `恢复 ${item.source}`,
        detail: item.summary,
        action: async () => {
          setInput(item.source)
          setView('convert')
        }
      })),
    [history, setInput, setView]
  )

  const navCommands = useMemo(
    () => [
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
    ],
    [setView]
  )

  const commands = useMemo(
    () =>
      [...formatCommands, ...historyCommands, ...navCommands].filter((item) =>
        `${item.title} ${item.detail}`.toLowerCase().includes(normalized)
      ),
    [formatCommands, historyCommands, navCommands, normalized]
  )

  return (
    <div className={styles.backdrop} onMouseDown={close}>
      <div className={styles.box} onMouseDown={(event) => event.stopPropagation()}>
        <div className={styles.input}>
          <Search size={17} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索格式、历史或设置"
          />
        </div>
        <div className={styles.results}>
          {commands.slice(0, 8).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                void item.action().finally(close)
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
