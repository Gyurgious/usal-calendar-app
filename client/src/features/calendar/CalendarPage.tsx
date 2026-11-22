import { useState } from 'react'
import { Alert, Spinner } from 'react-bootstrap'
import { useSearchParams } from 'react-router'
import { CalendarToolbar } from './CalendarToolbar'
import { getVisibleRange, parseIsoDate, shiftDate, toIsoDate, type CalendarView } from './calendarDates'
import { DayView } from './DayView'
import { MonthView } from './MonthView'
import { useCalendarEvents } from './useCalendarEvents'

/**
 * Month and Day views. The view and the selected date live in the URL (?view=day&date=2026-11-05),
 * so refresh, Back/Forward and bookmarks all keep your place.
 */
export function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [today] = useState(() => new Date()) // read the clock once, not on every render
  const view: CalendarView = searchParams.get('view') === 'day' ? 'day' : 'month'
  const date = parseIsoDate(searchParams.get('date')) ?? today

  const { from, to } = getVisibleRange(view, date)
  const { data: events = [], isPending, isError, error } = useCalendarEvents(from, to)

  const show = (nextView: CalendarView, nextDate: Date) =>
    setSearchParams({ view: nextView, date: toIsoDate(nextDate) })

  return (
    <>
      <CalendarToolbar
        view={view}
        date={date}
        onPrevious={() => show(view, shiftDate(view, date, -1))}
        onToday={() => show(view, new Date())}
        onNext={() => show(view, shiftDate(view, date, 1))}
        onViewChange={(nextView) => show(nextView, date)} // keeps the selected date
      />

      {isError && <Alert variant="danger">Could not load events: {error.message}</Alert>}

      {isPending ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status" aria-label="Loading events" />
        </div>
      ) : view === 'month' ? (
        <MonthView date={date} events={events} onSelectDay={(day) => show('day', day)} />
      ) : (
        <DayView events={events} />
      )}
    </>
  )
}
