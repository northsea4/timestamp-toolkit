import clsx from 'clsx'
import { Copy } from 'lucide-react'
import type { FormatRow } from '../../shared/types'
import styles from './FormatLine.module.css'

export function FormatLine({
  row,
  variant,
  copyValue
}: {
  row: FormatRow
  variant?: 'live' | 'parse'
  copyValue: (value: string, label?: string) => Promise<void>
}) {
  const lineClass = row.primary
    ? variant === 'parse'
      ? styles.primaryParse
      : styles.primaryLive
    : styles.line

  return (
    <div className={clsx(styles.line, lineClass)}>
      <span className={styles.label}>{row.label}</span>
      <span className={styles.value}>{row.value}</span>
      <button
        className={styles.copyButton}
        type="button"
        title={`复制${row.label}`}
        onClick={() => void copyValue(row.value, row.label)}>
        <Copy size={15} />
      </button>
    </div>
  )
}
