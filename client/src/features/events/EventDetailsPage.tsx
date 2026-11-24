import { useState } from 'react'
import { Alert, Button, Spinner } from 'react-bootstrap'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/httpClient'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { Icon } from '../../shared/components/Icon'
import { formatLongDate, formatTime, formatTimestamp } from '../calendar/calendarDates'
import { EventFormModal } from './EventFormModal'
import { EventStatusBadge } from './EventStatusBadge'
import { useApproveEvent, useDeleteEvent, useEvent } from './useEventActions'
import './events.css'

type Message = { variant: 'success' | 'danger'; text: string }

const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong.')

/** One event with everything about it, plus Approve / Edit / Delete (approvers only). */
export function EventDetailsPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const { data: event, isPending, error } = useEvent(id)
  const approve = useApproveEvent()
  const remove = useDeleteEvent()
  const [message, setMessage] = useState<Message | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  if (isPending) {
    return (
      <div className="loading">
        <Spinner animation="border" role="status" aria-label="Loading event" />
      </div>
    )
  }

  // Only show the error when there's nothing to show. (Right after a delete, a refetch fails with 404
  // while we still have the old data, and we're about to leave the page anyway.)
  if (!event) {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <>
        <Alert variant={notFound ? 'warning' : 'danger'}>
          {notFound ? 'This event does not exist. It may have been deleted.' : `Could not load the event: ${errorText(error)}`}
        </Alert>
        <Link to="/events" className="back-link">
          ← Back to events
        </Link>
      </>
    )
  }

  const handleApprove = async () => {
    setMessage(null)
    try {
      await approve.mutateAsync(event.id)
      setMessage({ variant: 'success', text: `"${event.title}" was approved and is now on the calendar.` })
    } catch (err) {
      setMessage({ variant: 'danger', text: errorText(err) }) // e.g. the day already has 10 approved events
    }
  }

  const handleDelete = async () => {
    try {
      await remove.mutateAsync(event.id)
      navigate('/events', { state: { message: `"${event.title}" was deleted.` } })
    } catch (err) {
      setMessage({ variant: 'danger', text: errorText(err) })
      setIsConfirmingDelete(false)
    }
  }

  const isBusy = approve.isPending || remove.isPending

  return (
    <>
      <Link to="/events" className="back-link">
        ← Back to events
      </Link>

      {message && (
        <Alert variant={message.variant} dismissible onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <article className="panel">
        <div className="detail-header">
          <div>
            <h1>
              {event.title} <EventStatusBadge isApproved={event.isApproved} />
            </h1>
            <p>
              {formatLongDate(event.date)} · {formatTime(event.time)}
              {event.location && ` · ${event.location}`}
            </p>
          </div>
          <div className="detail-actions">
            {!event.isApproved && (
              <Button size="sm" variant="approve" disabled={isBusy} onClick={handleApprove}>
                <Icon name="check" size={16} />
                Approve
              </Button>
            )}
            <Button size="sm" variant="outline-secondary" disabled={isBusy} onClick={() => setIsEditing(true)}>
              <Icon name="edit" size={15} />
              Edit
            </Button>
            <Button size="sm" variant="soft-danger" disabled={isBusy} onClick={() => setIsConfirmingDelete(true)}>
              <Icon name="trash" size={15} />
              Delete
            </Button>
          </div>
        </div>

        <dl className="detail-list">
          <div>
            <dt>Date</dt>
            <dd>{formatLongDate(event.date)}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>{formatTime(event.time)}</dd>
          </div>
          <div className="wide">
            <dt>Location</dt>
            <dd>{event.location ?? <span className="note">None</span>}</dd>
          </div>
          <div className="wide">
            <dt>Description</dt>
            <dd>{event.description ?? <span className="note">None</span>}</dd>
          </div>
          <div>
            <dt>Created by</dt>
            <dd>
              {event.creatorName} <span className="note">on {formatTimestamp(event.createdAtUtc)}</span>
            </dd>
          </div>
          <div>
            <dt>Approved by</dt>
            <dd>
              {event.approverName && event.approvedAtUtc ? (
                <>
                  {event.approverName} <span className="note">on {formatTimestamp(event.approvedAtUtc)}</span>
                </>
              ) : (
                <span className="note">Not approved yet</span>
              )}
            </dd>
          </div>
        </dl>
      </article>

      {isEditing && (
        <EventFormModal
          event={event}
          onClose={() => setIsEditing(false)}
          onSaved={(saved) => {
            setIsEditing(false)
            setMessage({ variant: 'success', text: `"${saved.title}" was saved.` })
          }}
        />
      )}

      {isConfirmingDelete && (
        <ConfirmDialog
          title="Delete event"
          confirmLabel="Delete"
          isWorking={remove.isPending}
          onConfirm={handleDelete}
          onCancel={() => setIsConfirmingDelete(false)}
        >
          Delete <strong>{event.title}</strong>? This cannot be undone.
        </ConfirmDialog>
      )}
    </>
  )
}