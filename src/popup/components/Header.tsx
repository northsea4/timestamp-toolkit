import { Command, History, Home, Settings as SettingsIcon } from 'lucide-react'
import type { ViewName } from '../../shared/types'
import { IconButton } from './IconButton'
import styles from './Header.module.css'

export function Header({
  view,
  setView,
  openCommand
}: {
  view: ViewName
  setView: (view: ViewName) => void
  openCommand: () => void
}) {
  return (
    <header className={styles.header}>
      <button className={styles.brandButton} onClick={() => setView('convert')} type="button">
        <span className={styles.brandMark}>T</span>
        <span>
          <strong>时间工具箱</strong>
          <small>{view === 'convert' ? '转换' : view === 'recent' ? '历史' : '设置'}</small>
        </span>
      </button>
      <div className={styles.actions}>
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
