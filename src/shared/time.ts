import type { FormatRow, ParseResult, TimestampUnit } from './types'

const NUMERIC_RE = /^[+-]?\d+$/
const LOCAL_DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?)?$/

export function parseTimeInput(raw: string): ParseResult | null {
  const source = raw.trim()
  if (!source) return null

  if (NUMERIC_RE.test(source)) {
    return parseTimestamp(source)
  }

  const localMatch = source.match(LOCAL_DATETIME_RE)
  if (localMatch) {
    const [, yyyy, mm, dd, hh = '00', mi = '00', ss = '00', fraction = ''] = localMatch
    const ms = Number(fraction.padEnd(3, '0').slice(0, 3))
    const date = new Date(
      Number(yyyy),
      Number(mm) - 1,
      Number(dd),
      Number(hh),
      Number(mi),
      Number(ss),
      ms
    )
    if (!Number.isNaN(date.getTime())) {
      return {
        kind: 'datetime',
        source,
        date,
        precisionTail: fraction.length > 3 ? fraction.slice(3) : undefined
      }
    }
  }

  const parsed = new Date(source)
  if (!Number.isNaN(parsed.getTime())) {
    return { kind: 'datetime', source, date: parsed }
  }

  return null
}

export function parseTimestamp(source: string): ParseResult | null {
  const sign = source.startsWith('-') ? '-' : ''
  const digits = source.replace(/^[+-]/, '')
  if (!digits) return null

  const unit = inferTimestampUnit(digits)
  const millis = toMilliseconds(sign + digits, unit)
  if (millis === null) return null

  const date = new Date(millis)
  if (Number.isNaN(date.getTime())) return null

  return {
    kind: 'timestamp',
    source,
    unit,
    date,
    precisionTail:
      unit === 'microseconds'
        ? digits.slice(-3)
        : unit === 'nanoseconds'
          ? digits.slice(-6)
          : undefined
  }
}

export function inferTimestampUnit(digits: string): TimestampUnit {
  if (digits.length <= 10) return 'seconds'
  if (digits.length <= 13) return 'milliseconds'
  if (digits.length <= 16) return 'microseconds'
  return 'nanoseconds'
}

function toMilliseconds(value: string, unit: TimestampUnit): number | null {
  try {
    const bigint = BigInt(value)
    const divisor =
      unit === 'seconds'
        ? 1n
        : unit === 'milliseconds'
          ? 1n
          : unit === 'microseconds'
            ? 1000n
            : 1000000n
    const multiplier = unit === 'seconds' ? 1000n : 1n
    const millis =
      unit === 'seconds' || unit === 'milliseconds' ? bigint * multiplier : bigint / divisor
    const asNumber = Number(millis)
    return Number.isSafeInteger(asNumber) ? asNumber : null
  } catch {
    return null
  }
}

export function makeFormatRows(date: Date, timezone: string): FormatRow[] {
  const seconds = Math.floor(date.getTime() / 1000).toString()
  const milliseconds = date.getTime().toString()
  const datetime = formatInTimezone(date, timezone)
  const dateOnly = datetime.slice(0, 10)
  const utc = formatInTimezone(date, 'UTC') + ' UTC'

  return [
    { id: 'seconds', label: 'Unix 秒', value: seconds, primary: true },
    { id: 'milliseconds', label: 'Unix 毫秒', value: milliseconds, primary: true },
    { id: 'datetime', label: '日期时间', value: datetime, primary: true },
    { id: 'date', label: '日期', value: dateOnly, primary: true },
    { id: 'iso', label: 'ISO', value: date.toISOString() },
    { id: 'utc', label: 'UTC', value: utc },
    { id: 'rfc2822', label: 'RFC 2822', value: date.toUTCString() },
    { id: 'filename', label: '文件名', value: datetime.replace(' ', '_').replaceAll(':', '-') }
  ]
}

export function formatInTimezone(date: Date, timezone: string): string {
  const timeZone = timezone === 'local' ? undefined : timezone
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  return formatter.format(date).replace('T', ' ')
}

export function timestampUnitLabel(unit?: TimestampUnit): string {
  switch (unit) {
    case 'seconds':
      return '秒'
    case 'milliseconds':
      return '毫秒'
    case 'microseconds':
      return '微秒'
    case 'nanoseconds':
      return '纳秒'
    default:
      return '日期'
  }
}
