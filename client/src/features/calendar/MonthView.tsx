import { format, isSameMonth, isToday } from 'date-fns'
import { Table } from 'react-bootstrap'
import type { CalendarEvent } from './calendarApi'
import { formatTime, getMonthGrid, groupByDate, toIsoDate } from './calendarDates'
import './calendar.css'

interface MonthViewProps {
  date: Date
  events: CalendarEvent[]
  onSelectDay: (day: Date) => void
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Month grid. Each day lists its events with time, title and location only. */
export function MonthView({ date, events, onSelectDay }: MonthViewProps) {
  const weeks = getMonthGrid(date)
  const eventsByDate = groupByDate(events)

  return (
    <Table bordered className="calendar-month">
      <thead>
        <tr>
          {WEEKDAYS.map((weekday) => (
            <th key={weekday}>{weekday}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week) => (
          <tr key={toIsoDate(week[0])}>
            {week.map((day) => {
              const dayEvents = eventsByDate.get(toIsoDate(day)) ?? []
              return (
                <td
                  key={toIsoDate(day)}
                  className={isSameMonth(day, date) ? undefined : 'is-outside-month'}
                  onClick={() => onSelectDay(day)}
                >
                  <button
                    type="button"
                    className={`calendar-day-number${isToday(day) ? ' is-today' : ''}`}
                    aria-label={`View ${format(day, 'EEEE, MMMM d')}`}
                  >
                    {format(day, 'd')}
                  </button>
                  <ul className="list-unstyled mb-0">
                    {dayEvents.map((event) => (
                      <li
                        key={event.id}
                        className={`calendar-event${event.isApproved ? '' : ' text-body-secondary fst-italic'}`}
                        title={event.isApproved ? undefined : 'Pending approval'}
                      >
                        <span className="fw-semibold">{formatTime(event.time)}</span> {event.title}
                        {event.location && <span className="text-body-secondary"> · {event.location}</span>}
                      </li>
                    ))}
                  </ul>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
