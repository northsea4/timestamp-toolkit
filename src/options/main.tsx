import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "../styles/app.css";
import { DEFAULT_SETTINGS, TIMEZONES } from "../shared/constants";
import { clearHistory, loadSettings, saveSettings } from "../shared/storage";
import { applyTheme } from "../shared/theme";
import type { Settings } from "../shared/types";

function OptionsApp() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void loadSettings().then((loaded) => {
      setSettings(loaded);
      applyTheme(loaded.theme);
    });
  }, []);

  async function update(next: Settings) {
    if (next.autoReadClipboard && !settings.autoReadClipboard && typeof chrome !== "undefined" && chrome.permissions) {
      const granted = await chrome.permissions.request({ permissions: ["clipboardRead"] });
      if (!granted) next = { ...next, autoReadClipboard: false };
    }

    setSettings(next);
    applyTheme(next.theme);
    await saveSettings(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  }

  return (
    <main className="options-page">
      <section className="options-card">
        <div className="options-header">
          <div>
            <h1>时间工具箱设置</h1>
            <p>设置会通过 Chrome 同步；最近记录只保存在本机。</p>
          </div>
          {saved && <span className="saved-pill">已保存</span>}
        </div>

        <div className="settings-list wide">
          <label className="setting-row">
            <span>主题</span>
            <select value={settings.theme} onChange={(event) => void update({ ...settings, theme: event.target.value as Settings["theme"] })}>
              <option value="system">跟随系统</option>
              <option value="dark">深色</option>
              <option value="light">浅色</option>
            </select>
          </label>
          <label className="setting-row">
            <span>默认时区</span>
            <select value={settings.timezone} onChange={(event) => void update({ ...settings, timezone: event.target.value })}>
              {TIMEZONES.map((timezone) => (
                <option key={timezone.id} value={timezone.id}>
                  {timezone.label}
                </option>
              ))}
            </select>
          </label>
          <label className="setting-row">
            <span>打开 Popup 时自动读取剪贴板</span>
            <input
              type="checkbox"
              checked={settings.autoReadClipboard}
              onChange={(event) => void update({ ...settings, autoReadClipboard: event.target.checked })}
            />
          </label>
          <label className="setting-row">
            <span>打开时聚焦输入框</span>
            <input
              type="checkbox"
              checked={settings.focusInputOnOpen}
              onChange={(event) => void update({ ...settings, focusInputOnOpen: event.target.checked })}
            />
          </label>
          <label className="setting-row">
            <span>保存最近 30 条记录</span>
            <input
              type="checkbox"
              checked={settings.historyEnabled}
              onChange={(event) => void update({ ...settings, historyEnabled: event.target.checked })}
            />
          </label>
        </div>

        <div className="danger-row">
          <div>
            <strong>清空最近记录</strong>
            <p>这只会清除本机历史，不影响同步设置。</p>
          </div>
          <button type="button" onClick={() => void clearHistory()}>
            清空
          </button>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<OptionsApp />);
