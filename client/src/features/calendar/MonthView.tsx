import { format, isSameMonth, isToday } from 'date-fns'
import type { CalendarEvent } from './calendarApi'
import { formatTime, getMonthGrid, groupByDate, toIsoDate } from './calendarDates'

interface MonthViewProps {
  date: Date
  events: CalendarEvent[]
  onSelectDay: (day: Date) => void
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** How many events fit in a day cell before "+N more". The Day view always lists them all. */
const MAX_EVENTS_PER_CELL = 3

/** Month grid. Each day lists its events with time, title and location only. */
export function MonthView({ date, events, onSelectDay }: MonthViewProps) {
  const days = getMonthGrid(date).flat()
  const eventsByDate = groupByDate(events)

  return (
    <>
      <div className="legend">
        <span>
          <i aria-hidden="true" />
          Approved
        </span>
        <span>
          <i className="is-pending" aria-hidden="true" />
          <em>Pending approval</em>
        </span>
        <span className="legend-note">Pending events don’t count toward the 10-per-day limit.</span>
      </div>

      <div className="month-wrap">
        <div className="week-row">
          {WEEKDAYS.map((weekday) => (
            <div key={weekday}>{weekday}</div>
          ))}
        </div>
        <div className="month-grid">
          {days.map((day) => {
            const dayEvents = eventsByDate.get(toIsoDate(day)) ?? []
            const shown = dayEvents.slice(0, MAX_EVENTS_PER_CELL)
            const hidden = dayEvents.length - shown.length
            const classes = ['day-cell', isSameMonth(day, date) ? '' : 'muted', isToday(day) ? 'today-cell' : '']

            return (
              // The whole cell opens the day; the day-number button is the keyboard and screen-reader way in.
              <div key={toIsoDate(day)} className={classes.join(' ').trim()} onClick={() => onSelectDay(day)}>
                <button type="button" className="day-number" aria-label={`View ${format(day, 'EEEE, MMMM d')}`}>
                  {format(day, 'd')}
                </button>
                <ul className="cell-events">
                  {shown.map((event) => (
                    <li
                      key={event.id}
                      className={`event-pill${event.isApproved ? '' : ' is-pending'}`}
                      title={event.isApproved ? undefined : 'Pending approval'}
                    >
                      <strong>{formatTime(event.time)}</strong> {event.title}
                      {event.location && <span className="pill-location"> · {event.location}</span>}
                    </li>
                  ))}
                </ul>
                {hidden > 0 && (
                  <button
                    type="button"
                    className="more"
                    aria-label={`Show all ${dayEvents.length} events on ${format(day, 'MMMM d')}`}
                  >
                    +{hidden} more
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
