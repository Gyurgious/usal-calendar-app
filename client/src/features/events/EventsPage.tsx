import { useState } from 'react'
import { Alert, Form, Spinner, Table } from 'react-bootstrap'
import { Link, useLocation, useSearchParams } from 'react-router'
import { formatLongDate, formatTime } from '../calendar/calendarDates'
import { EventStatusBadge } from './EventStatusBadge'
import type { EventStatusFilter } from './eventsApi'
import { useEvents } from './useEventActions'

/** Anything other than "approved" or "pending" in the URL means "all". */
const parseStatus = (value: string | null): EventStatusFilter =>
  value === 'approved' || value === 'pending' ? value : 'all'

/**All events for approvers, filterable by status. The filter lives in the URL (?status=pending), */
export function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const status = parseStatus(searchParams.get('status'))
  const { data: events = [], isPending, isError, error } = useEvents(status)

  // The details page sends a message here after deleting an event.
  const [message, setMessage] = useState<string | null>(
    () => (location.state as { message?: string } | null)?.message ?? null,
  )

  const changeStatus = (next: string) => setSearchParams(next === 'all' ? {} : { status: next })

  return (
    <>
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">Events</h1>
        <Form.Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => changeStatus(e.target.value)}
          style={{ width: 'auto' }}
        >
          <option value="all">All events</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
        </Form.Select>
      </div>

      {message && (
        <Alert variant="success" dismissible onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}
      {isError && <Alert variant="danger">Could not load events: {error.message}</Alert>}

      {isPending ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status" aria-label="Loading events" />
        </div>
      ) : events.length === 0 ? (
        <p className="text-body-secondary">No events match this filter.</p>
      ) : (
        <>
          <p className="text-body-secondary small mb-2">
            {events.length} {events.length === 1 ? 'event' : 'events'}
          </p>
          <Table responsive striped hover className="align-middle">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Title</th>
                <th>Location</th>
                <th>Status</th>
                <th>Created by</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="text-nowrap">{formatLongDate(event.date)}</td>
                  <td className="text-nowrap">{formatTime(event.time)}</td>
                  <td>
                    <Link to={`/events/${event.id}`}>{event.title}</Link>
                  </td>
                  <td>{event.location}</td>
                  <td>
                    <EventStatusBadge isApproved={event.isApproved} />
                  </td>
                  <td>{event.creatorName}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
    </>
  )
}