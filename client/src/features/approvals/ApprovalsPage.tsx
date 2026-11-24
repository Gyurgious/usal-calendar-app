import { format } from 'date-fns'
import { useState } from 'react'
import { Alert, Button, Spinner } from 'react-bootstrap'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { Icon } from '../../shared/components/Icon'
import { formatTime, formatTimestamp, parseIsoDate } from '../calendar/calendarDates'
import type { PendingEvent } from '../events/eventsApi'
import { useApproveEvent, useDeleteEvent, usePendingEvents } from '../events/useEventActions'
import './approvals.css'

type Message = { variant: 'success' | 'danger'; text: string }

const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong.')

/** Pending submissions waiting for an approver. */
export function ApprovalsPage() {
  const { data: pending = [], isPending, isError, error } = usePendingEvents()
  const approve = useApproveEvent()
  const remove = useDeleteEvent()
  const [message, setMessage] = useState<Message | null>(null)
  const [eventToDelete, setEventToDelete] = useState<PendingEvent | null>(null)

  const handleApprove = async (event: PendingEvent) => {
    setMessage(null)
    try {
      await approve.mutateAsync(event.id)
      setMessage({ variant: 'success', text: `"${event.title}" was approved and is now on the calendar.` })
    } catch (err) {
      setMessage({ variant: 'danger', text: errorText(err) }) // e.g. the day already has 10 approved events
    }
  }

  const handleDelete = async (event: PendingEvent) => {
    try {
      await remove.mutateAsync(event.id)
      setMessage({ variant: 'success', text: `"${event.title}" was deleted.` })
    } catch (err) {
      setMessage({ variant: 'danger', text: errorText(err) })
    } finally {
      setEventToDelete(null)
    }
  }

  // Only the row being worked on is disabled; the rest stay usable.
  const isBusy = (id: number) =>
    (approve.isPending && approve.variables === id) || (remove.isPending && remove.variables === id)

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Pending Approvals</h1>
          <p>Review event submissions before they appear on the school calendar.</p>
        </div>
        {!isPending && !isError && <span className="count-chip">{pending.length} pending</span>}
      </div>

      {message && (
        <Alert variant={message.variant} dismissible onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}
      {isError && <Alert variant="danger">Could not load pending events: {error.message}</Alert>}

      <section className="panel approvals-panel" aria-labelledby="submitted-title">
        <div className="panel-title">
          <h2 id="submitted-title">Submitted events</h2>
          <p>Approving adds an event to the calendar. A day can hold at most 10 approved events.</p>
        </div>

        {isPending ? (
          <div className="loading">
            <Spinner animation="border" role="status" aria-label="Loading pending events" />
          </div>
        ) : pending.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Icon name="check" size={24} />
            </div>
            <h3>You’re all caught up</h3>
            <p>No events are waiting for approval.</p>
          </div>
        ) : (
          <>
            {/* Column labels for wide screens. Hidden from screen readers: each row's <dl> names its own fields. */}
            <div className="approval-columns" aria-hidden="true">
              <span>Event</span>
              <span>When</span>
              <span>Submitted by</span>
            </div>
            <ul className="approval-list">
              {pending.map((event) => (
                <li key={event.id}>
                  <article className="approval-item">
                    <div className="request-event">
                      <div className="request-icon" aria-hidden="true">
                        <Icon name="calendar" />
                      </div>
                      <div>
                        <h3>{event.title}</h3>
                        {event.description ? (
                          <p className="request-description">{event.description}</p>
                        ) : (
                          <p className="request-description is-empty">No description</p>
                        )}
                      </div>
                    </div>

                    <dl className="request-details">
                      <div>
                        <dt>When</dt>
                        <dd>
                          <span className="primary-line">{format(parseIsoDate(event.date)!, 'EEE, MMM d, yyyy')}</span>
                          <span className="secondary-line">
                            <span>{formatTime(event.time)}</span>
                            {event.location && (
                              <>
                                {' · '}
                                <span>{event.location}</span>
                              </>
                            )}
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt>Submitted by</dt>
                        <dd>
                          <strong className="primary-line">{event.creatorName}</strong>
                          <span className="secondary-line">{formatTimestamp(event.createdAtUtc)}</span>
                        </dd>
                      </div>
                    </dl>

                    <div className="approval-actions">
                      <Button
                        size="sm"
                        variant="approve"
                        disabled={isBusy(event.id)}
                        onClick={() => handleApprove(event)}
                        aria-label={`Approve ${event.title}`}
                      >
                        <Icon name="check" size={16} />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="soft-danger"
                        disabled={isBusy(event.id)}
                        onClick={() => setEventToDelete(event)}
                        aria-label={`Delete ${event.title}`}
                      >
                        <Icon name="trash" size={16} />
                        Delete
                      </Button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {eventToDelete && (
        <ConfirmDialog
          title="Delete event"
          confirmLabel="Delete"
          isWorking={remove.isPending}
          onConfirm={() => handleDelete(eventToDelete)}
          onCancel={() => setEventToDelete(null)}
        >
          Delete <strong>{eventToDelete.title}</strong> submitted by {eventToDelete.creatorName}? This cannot be undone.
        </ConfirmDialog>
      )}
    </>
  )
}