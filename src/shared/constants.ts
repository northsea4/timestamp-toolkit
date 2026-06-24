import type { Settings } from "./types";

export const POPUP_WIDTH = 460;
export const POPUP_HEIGHT = 600;

export const TIMEZONES = [
  { id: "local", label: "本地" },
  { id: "UTC", label: "UTC" },
  { id: "Asia/Shanghai", label: "上海" },
  { id: "America/Los_Angeles", label: "洛杉矶" },
  { id: "Europe/London", label: "伦敦" },
  { id: "Asia/Tokyo", label: "东京" }
];

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  timezone: "local",
  autoReadClipboard: false,
  focusInputOnOpen: true,
  historyEnabled: true
};

export const HISTORY_LIMIT = 30;
