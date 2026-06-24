import { describe, expect, it } from 'vitest'
import {
  inferTimestampUnit,
  makeFormatRows,
  parseTimeInput,
  parseTimestamp,
  timestampUnitLabel
} from './time'

describe('parseTimeInput', () => {
  it('returns null for empty or whitespace input', () => {
    expect(parseTimeInput('')).toBeNull()
    expect(parseTimeInput('   ')).toBeNull()
  })

  it('parses a seconds timestamp', () => {
    const result = parseTimeInput('1700000000')
    expect(result).not.toBeNull()
    expect(result!.kind).toBe('timestamp')
    expect(result!.unit).toBe('seconds')
    expect(result!.date.getTime()).toBe(1700000000000)
  })

  it('parses a milliseconds timestamp', () => {
    const result = parseTimeInput('1700000000000')
    expect(result).not.toBeNull()
    expect(result!.unit).toBe('milliseconds')
    expect(result!.date.getTime()).toBe(1700000000000)
  })

  it('parses a microseconds timestamp', () => {
    const result = parseTimeInput('1700000000000000')
    expect(result).not.toBeNull()
    expect(result!.unit).toBe('microseconds')
    expect(result!.date.getTime()).toBe(1700000000000)
    expect(result!.precisionTail).toBe('000')
  })

  it('parses a nanoseconds timestamp', () => {
    const result = parseTimeInput('1700000000000000000')
    expect(result).not.toBeNull()
    expect(result!.unit).toBe('nanoseconds')
    expect(result!.date.getTime()).toBe(1700000000000)
    expect(result!.precisionTail).toBe('000000')
  })

  it('parses a negative timestamp', () => {
    const result = parseTimeInput('-1000')
    expect(result).not.toBeNull()
    expect(result!.kind).toBe('timestamp')
    expect(result!.date.getTime()).toBe(-1000000)
  })

  it('parses a signed positive timestamp', () => {
    const result = parseTimeInput('+1700000000')
    expect(result).not.toBeNull()
    expect(result!.date.getTime()).toBe(1700000000000)
  })

  it('returns null for a timestamp that overflows Number', () => {
    // A nanosecond timestamp whose millisecond value exceeds Number.MAX_SAFE_INTEGER
    expect(parseTimeInput('99999999999999999999999')).toBeNull()
  })

  it('parses YYYY-MM-DD format', () => {
    const result = parseTimeInput('2024-01-15')
    expect(result).not.toBeNull()
    expect(result!.kind).toBe('datetime')
    expect(result!.date.getFullYear()).toBe(2024)
    expect(result!.date.getMonth()).toBe(0) // January
    expect(result!.date.getDate()).toBe(15)
  })

  it('parses YYYY-MM-DD HH:mm:ss format', () => {
    const result = parseTimeInput('2024-01-15 10:30:45')
    expect(result).not.toBeNull()
    expect(result!.kind).toBe('datetime')
    expect(result!.date.getHours()).toBe(10)
    expect(result!.date.getMinutes()).toBe(30)
    expect(result!.date.getSeconds()).toBe(45)
  })

  it('parses datetime with T separator', () => {
    const result = parseTimeInput('2024-01-15T10:30:45')
    expect(result).not.toBeNull()
    expect(result!.date.getHours()).toBe(10)
  })

  it('parses datetime with fractional seconds', () => {
    const result = parseTimeInput('2024-01-15 10:30:45.123')
    expect(result).not.toBeNull()
    expect(result!.date.getMilliseconds()).toBe(123)
  })

  it('parses datetime with nanosecond fractional seconds', () => {
    const result = parseTimeInput('2024-01-15 10:30:45.123456789')
    expect(result).not.toBeNull()
    expect(result!.date.getMilliseconds()).toBe(123)
    expect(result!.precisionTail).toBe('456789')
  })

  it('falls back to Date constructor for ISO strings', () => {
    const result = parseTimeInput('2024-01-15T10:30:45Z')
    expect(result).not.toBeNull()
    expect(result!.kind).toBe('datetime')
  })

  it('returns null for unparseable input', () => {
    expect(parseTimeInput('hello world')).toBeNull()
    expect(parseTimeInput('not-a-date')).toBeNull()
  })
})

describe('parseTimestamp', () => {
  it('returns null for empty digits', () => {
    expect(parseTimestamp('+')).toBeNull()
    expect(parseTimestamp('-')).toBeNull()
  })

  it('parses a valid seconds timestamp', () => {
    const result = parseTimestamp('1700000000')
    expect(result).not.toBeNull()
    expect(result!.unit).toBe('seconds')
  })
})

describe('inferTimestampUnit', () => {
  it('infers seconds for <= 10 digits', () => {
    expect(inferTimestampUnit('1')).toBe('seconds')
    expect(inferTimestampUnit('1700000000')).toBe('seconds')
  })

  it('infers milliseconds for 11-13 digits', () => {
    expect(inferTimestampUnit('170000000000')).toBe('milliseconds') // 12 digits
    expect(inferTimestampUnit('1700000000000')).toBe('milliseconds') // 13 digits
  })

  it('infers microseconds for 14-16 digits', () => {
    expect(inferTimestampUnit('170000000000000')).toBe('microseconds') // 15 digits
    expect(inferTimestampUnit('1700000000000000')).toBe('microseconds') // 16 digits
  })

  it('infers nanoseconds for 17+ digits', () => {
    expect(inferTimestampUnit('1700000000000000000')).toBe('nanoseconds')
    expect(inferTimestampUnit('17000000000000000000')).toBe('nanoseconds')
  })
})

describe('makeFormatRows', () => {
  it('returns 8 format rows', () => {
    const rows = makeFormatRows(new Date(1700000000000), 'UTC')
    expect(rows).toHaveLength(8)
  })

  it('has correct ids', () => {
    const rows = makeFormatRows(new Date(1700000000000), 'UTC')
    const ids = rows.map((r) => r.id)
    expect(ids).toEqual([
      'seconds',
      'milliseconds',
      'datetime',
      'date',
      'iso',
      'utc',
      'rfc2822',
      'filename'
    ])
  })

  it('marks primary rows', () => {
    const rows = makeFormatRows(new Date(1700000000000), 'UTC')
    const primaryRows = rows.filter((r) => r.primary)
    expect(primaryRows).toHaveLength(4)
  })

  it('produces correct seconds value', () => {
    const rows = makeFormatRows(new Date(1700000000000), 'UTC')
    expect(rows[0].value).toBe('1700000000')
  })

  it('produces correct milliseconds value', () => {
    const rows = makeFormatRows(new Date(1700000000000), 'UTC')
    expect(rows[1].value).toBe('1700000000000')
  })
})

describe('timestampUnitLabel', () => {
  it('maps units to Chinese labels', () => {
    expect(timestampUnitLabel('seconds')).toBe('秒')
    expect(timestampUnitLabel('milliseconds')).toBe('毫秒')
    expect(timestampUnitLabel('microseconds')).toBe('微秒')
    expect(timestampUnitLabel('nanoseconds')).toBe('纳秒')
    expect(timestampUnitLabel()).toBe('日期')
  })
})
