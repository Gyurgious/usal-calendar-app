import { useState } from 'react'
import { Alert, Button, Form, Spinner } from 'react-bootstrap'
import { Icon } from '../../shared/components/Icon'
import { Link, useLocation, useSearchParams } from 'react-router'
import { formatLongDate, formatTime, toIsoDate } from '../calendar/calendarDates'
import { EventFormModal } from './EventFormModal'
import { EventStatusBadge } from './EventStatusBadge'
import type { EventStatusFilter, ManagedEvent } from './eventsApi'
import { useEvents } from './useEventActions'
import './events.css'

/** Anything other than "approved" or "pending" in the URL means "all". */
const parseStatus = (value: string | null): EventStatusFilter =>
  value === 'approved' || value === 'pending' ? value : 'all'

const matchesSearch = (event: ManagedEvent, term: string) =>
  [event.title].some((text) => text?.toLowerCase().includes(term))

export function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const status = parseStatus(searchParams.get('status'))
  const { data: events = [], isPending, isError, error } = useEvents(status)

  const [search, setSearch] = useState('')
  const term = search.trim().toLowerCase()
  const shownEvents = term ? events.filter((event) => matchesSearch(event, term)) : events

  // The details page sends a message here after deleting an event.
  const [message, setMessage] = useState<string | null>(
    () => (location.state as { message?: string } | null)?.message ?? null,
  )
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [today] = useState(() => new Date()) // read the clock once, not on every render

  const changeStatus = (next: string) => setSearchParams(next === 'all' ? {} : { status: next })

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Events</h1>
          <p>Every event on the school calendar, approved and pending.</p>
        </div>
        <Button
          onClick={() => {
            setMessage(null)
            setIsFormOpen(true)
          }}
        >
          <Icon name="plus" size={17} />
          New event
        </Button>
      </div>

      {message && (
        <Alert variant="success" dismissible onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}
      {isError && <Alert variant="danger">Could not load events: {error.message}</Alert>}

      <section className="panel" aria-label="Events">
        <div className="table-search">
          <span className="count">
            {isPending ? 'Loading…' : `${shownEvents.length} ${shownEvents.length === 1 ? 'event' : 'events'}`}
          </span>
          <div className="filters">
            <Form.Control
              type="search"
              className="search-input"
              placeholder="Search event"
              aria-label="Search events"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Form.Select aria-label="Filter by status" value={status} onChange={(e) => changeStatus(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </Form.Select>
          </div>
        </div>

        {isPending ? (
          <div className="loading">
            <Spinner animation="border" role="status" aria-label="Loading events" />
          </div>
        ) : shownEvents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Icon name="list" size={24} />
            </div>
            {term ? (
              <>
                <h3>No results</h3>
                <p>No events match “{search.trim()}”.</p>
                <Button variant="outline-secondary" size="sm" onClick={() => setSearch('')}>
                  Clear search
                </Button>
              </>
            ) : (
              <>
                <h3>No events</h3>
                <p>No events match this filter.</p>
              </>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">Date &amp; time</th>
                  <th scope="col">Location</th>
                  <th scope="col">Created by</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {shownEvents.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <Link to={`/events/${event.id}`}>{event.title}</Link>
                    </td>
                    <td>
                      <span>{formatLongDate(event.date)}</span> · <span>{formatTime(event.time)}</span>
                    </td>
                    <td>{event.location}</td>
                    <td>{event.creatorName}</td>
                    <td>
                      <EventStatusBadge isApproved={event.isApproved} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Rendered only while open, so every open starts with a fresh, empty form. The list refreshes by itself:
          saving an event reloads all event data. */}
      {isFormOpen && (
        <EventFormModal
          defaultDate={toIsoDate(today)}
          onClose={() => setIsFormOpen(false)}
          onSaved={(saved) => {
            setIsFormOpen(false)
            setMessage(`"${saved.title}" was added.`)
          }}
        />
      )}
    </>
  )
}
