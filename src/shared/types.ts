export type ThemeMode = "system" | "dark" | "light";

export type ViewName = "convert" | "recent" | "settings";

export type TimestampUnit = "seconds" | "milliseconds" | "microseconds" | "nanoseconds";

export type ParsedKind = "timestamp" | "datetime";

export interface Settings {
  theme: ThemeMode;
  timezone: string;
  autoReadClipboard: boolean;
  focusInputOnOpen: boolean;
  historyEnabled: boolean;
}

export interface ParseResult {
  kind: ParsedKind;
  source: string;
  unit?: TimestampUnit;
  date: Date;
  precisionTail?: string;
}

export interface FormatRow {
  id: string;
  label: string;
  value: string;
  monospace?: boolean;
  primary?: boolean;
}

export interface HistoryItem {
  id: string;
  source: string;
  summary: string;
  timezone: string;
  createdAt: number;
}
