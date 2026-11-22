import { describe, expect, it } from 'vitest'
import { formatTime, getMonthGrid, getVisibleRange, parseIsoDate, shiftDate, toIsoDate } from './calendarDates'

const d = (iso: string) => parseIsoDate(iso)!

describe('getMonthGrid', () => {
  it('starts on Sunday and ends on Saturday, padding with days from nearby months', () => {
    const weeks = getMonthGrid(d('2026-08-15')) // Aug 1, 2026 is a Saturday

    expect(toIsoDate(weeks[0][0])).toBe('2026-07-26')
    expect(toIsoDate(weeks[weeks.length - 1][6])).toBe('2026-09-05')
    expect(weeks).toHaveLength(6)
    expect(weeks.every((week) => week.length === 7)).toBe(true)
  })

  it('needs only 4 rows when the month fits exactly (Feb 2026)', () => {
    expect(getMonthGrid(d('2026-02-10'))).toHaveLength(4)
  })

  it('includes Feb 29 in a leap year', () => {
    const days = getMonthGrid(d('2028-02-01')).flat().map(toIsoDate)

    expect(days).toContain('2028-02-29')
  })
})

describe('getVisibleRange', () => {
  it('covers the whole visible grid in Month view', () => {
    expect(getVisibleRange('month', d('2026-11-20'))).toEqual({ from: '2026-11-01', to: '2026-12-05' })
  })

  it('is a single day in Day view', () => {
    expect(getVisibleRange('day', d('2026-11-20'))).toEqual({ from: '2026-11-20', to: '2026-11-20' })
  })
})

describe('shiftDate', () => {
  it('moves by month in Month view, clamping to the last day (Jan 31 → Feb 28)', () => {
    expect(toIsoDate(shiftDate('month', d('2026-01-31'), 1))).toBe('2026-02-28')
  })

  it('moves by day in Day view, across month ends', () => {
    expect(toIsoDate(shiftDate('day', d('2026-11-30'), 1))).toBe('2026-12-01')
    expect(toIsoDate(shiftDate('day', d('2026-11-01'), -1))).toBe('2026-10-31')
  })
})

describe('formatTime', () => {
  it.each([
    ['08:05:00', '8:05 AM'],
    ['12:00:00', '12:00 PM'],
    ['15:30:00', '3:30 PM'],
    ['00:00:00', '12:00 AM'],
  ])('formats %s as %s', (time, expected) => {
    expect(formatTime(time)).toBe(expected)
  })
})

describe('parseIsoDate', () => {
  it.each([null, '', 'not-a-date', '2026-02-30'])('returns null for %j', (value) => {
    expect(parseIsoDate(value)).toBeNull()
  })
})
