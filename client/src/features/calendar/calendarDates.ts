import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import type { CalendarEvent } from './calendarApi'

export type CalendarView = 'month' | 'day'

/** Date → "2026-11-05" (the format the API and the URL use). */
export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function parseIsoDate(value: string | null): Date | null {
  if (!value) {
    return null
  }
  const date = parse(value, 'yyyy-MM-dd', new Date())
  return isValid(date) ? date : null
}

export function formatTime(time: string): string {
  return format(parse(time, 'HH:mm:ss', new Date()), 'h:mm a')
}

export function formatLongDate(isoDate: string): string {
  return format(parse(isoDate, 'yyyy-MM-dd', new Date()), 'EEE, MMM d, yyyy')
}

export function formatTimestamp(utc: string): string {
  return format(new Date(utc), 'MMM d, yyyy h:mm a')
}

/** The month grid: full weeks (Sunday–Saturday) covering the whole month. 4 to 6 rows of 7 days. */
export function getMonthGrid(date: Date): Date[][] {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(date)),
    end: endOfWeek(endOfMonth(date)),
  })
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  return weeks
}

/** Which dates to fetch for the current view: the whole visible grid, or the single day. */
export function getVisibleRange(view: CalendarView, date: Date): { from: string; to: string } {
  if (view === 'day') {
    return { from: toIsoDate(date), to: toIsoDate(date) }
  }
  const weeks = getMonthGrid(date)
  return { from: toIsoDate(weeks[0][0]), to: toIsoDate(weeks[weeks.length - 1][6]) }
}

/** Prev/Next: move by one month in Month view, one day in Day view. */
export function shiftDate(view: CalendarView, date: Date, amount: 1 | -1): Date {
  return view === 'month' ? addMonths(date, amount) : addDays(date, amount)
}

/** Groups events by their "yyyy-MM-dd" date, keeping the server's time order. */
export function groupByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const byDate = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    const list = byDate.get(event.date)
    if (list) {
      list.push(event)
    } else {
      byDate.set(event.date, [event])
    }
  }
  return byDate
}
