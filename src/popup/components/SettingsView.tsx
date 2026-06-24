import type { Settings } from '../../shared/types'
import { TIMEZONES } from '../../shared/constants'
import styles from './SettingsView.module.css'

export function SettingsView({
  settings,
  setSettings
}: {
  settings: Settings
  setSettings: (settings: Settings) => Promise<void>
}) {
  return (
    <main className={styles.panel}>
      <div className={styles.title}>设置</div>
      <div className="settings-list">
        <label className="setting-row">
          <span>主题</span>
          <select
            value={settings.theme}
            onChange={(event) =>
              void setSettings({ ...settings, theme: event.target.value as Settings['theme'] })
            }>
            <option value="system">跟随系统</option>
            <option value="dark">深色</option>
            <option value="light">浅色</option>
          </select>
        </label>
        <label className="setting-row">
          <span>默认时区</span>
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
        <label className="setting-row">
          <span>打开时自动读取剪贴板</span>
          <input
            type="checkbox"
            checked={settings.autoReadClipboard}
            onChange={(event) =>
              void setSettings({ ...settings, autoReadClipboard: event.target.checked })
            }
          />
        </label>
        <label className="setting-row">
          <span>打开时聚焦输入框</span>
          <input
            type="checkbox"
            checked={settings.focusInputOnOpen}
            onChange={(event) =>
              void setSettings({ ...settings, focusInputOnOpen: event.target.checked })
            }
          />
        </label>
        <label className="setting-row">
          <span>保存最近记录</span>
          <input
            type="checkbox"
            checked={settings.historyEnabled}
            onChange={(event) =>
              void setSettings({ ...settings, historyEnabled: event.target.checked })
            }
          />
        </label>
      </div>
    </main>
  )
}
