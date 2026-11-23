import { useState } from 'react'
import { Alert, Button, Card, Spinner } from 'react-bootstrap'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/httpClient'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { formatLongDate, formatTime, formatTimestamp } from '../calendar/calendarDates'
import { EventFormModal } from './EventFormModal'
import { EventStatusBadge } from './EventStatusBadge'
import { useApproveEvent, useDeleteEvent, useEvent } from './useEventActions'

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
      <div className="text-center py-5">
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
        <Link to="/events">← Back to events</Link>
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
      <Link to="/events" className="d-inline-block mb-3">
        ← Back to events
      </Link>

      {message && (
        <Alert variant={message.variant} dismissible onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Card>
        <Card.Header className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
          <h1 className="h4 mb-0">
            {event.title} <EventStatusBadge isApproved={event.isApproved} />
          </h1>
          <div className="d-flex gap-2">
            {!event.isApproved && (
              <Button size="sm" variant="success" disabled={isBusy} onClick={handleApprove}>
                Approve
              </Button>
            )}
            <Button size="sm" variant="outline-primary" disabled={isBusy} onClick={() => setIsEditing(true)}>
              Edit
            </Button>
            <Button size="sm" variant="outline-danger" disabled={isBusy} onClick={() => setIsConfirmingDelete(true)}>
              Delete
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          <dl className="row mb-0">
            <dt className="col-sm-3">Date</dt>
            <dd className="col-sm-9">{formatLongDate(event.date)}</dd>
            <dt className="col-sm-3">Time</dt>
            <dd className="col-sm-9">{formatTime(event.time)}</dd>
            <dt className="col-sm-3">Location</dt>
            <dd className="col-sm-9">{event.location ?? <span className="text-body-secondary">None</span>}</dd>
            <dt className="col-sm-3">Description</dt>
            <dd className="col-sm-9">{event.description ?? <span className="text-body-secondary">None</span>}</dd>
            <dt className="col-sm-3">Created by</dt>
            <dd className="col-sm-9">
              {event.creatorName} <span className="text-body-secondary">on {formatTimestamp(event.createdAtUtc)}</span>
            </dd>
            <dt className="col-sm-3">Approved by</dt>
            <dd className="col-sm-9">
              {event.approverName && event.approvedAtUtc ? (
                <>
                  {event.approverName}{' '}
                  <span className="text-body-secondary">on {formatTimestamp(event.approvedAtUtc)}</span>
                </>
              ) : (
                <span className="text-body-secondary">Not approved yet</span>
              )}
            </dd>
          </dl>
        </Card.Body>
      </Card>

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