import { Badge, ListGroup } from 'react-bootstrap'
import type { CalendarEvent } from './calendarApi'
import { formatTime } from './calendarDates'

/** One day's events with time, title, location, description and creator. */
export function DayView({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) {
    return <p className="text-body-secondary">No events on this day.</p>
  }

  return (
    <ListGroup as="ul">
      {events.map((event) => (
        <ListGroup.Item
          as="li"
          key={event.id}
          className={event.isApproved ? undefined : 'text-body-secondary fst-italic'}
        >
          <div className="d-flex gap-3">
            <div className="fw-semibold text-nowrap" style={{ minWidth: '5rem' }}>
              {formatTime(event.time)}
            </div>
            <div className="flex-grow-1">
              <div className="fw-semibold">
                {event.title}{' '}
                {!event.isApproved && (
                  <Badge bg="secondary" className="fst-normal">
                    Pending
                  </Badge>
                )}
              </div>
              {event.location && <div>{event.location}</div>}
              {event.description && <div className="mt-1">{event.description}</div>}
              <div className="small text-body-secondary mt-1">Created by {event.creatorName}</div>
            </div>
          </div>
        </ListGroup.Item>
      ))}
    </ListGroup>
  )
}
