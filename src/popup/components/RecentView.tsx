import { Copy, Trash2 } from 'lucide-react'
import type { HistoryItem } from '../../shared/types'
import { IconButton } from './IconButton'
import styles from './RecentView.module.css'

export function RecentView({
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
    <main className={styles.panel}>
      <div className={styles.title}>
        <span>最近 30 条</span>
        <IconButton title="清空历史" onClick={() => void clear()}>
          <Trash2 size={15} />
        </IconButton>
      </div>
      <div className={styles.list}>
        {history.length === 0 && <div className={styles.empty}>暂无历史记录</div>}
        {history.map((item) => (
          <div className={styles.item} key={item.id}>
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
