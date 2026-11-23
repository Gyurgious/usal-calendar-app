import { format } from 'date-fns'
import { useState } from 'react'
import { Alert, Button, Spinner, Table } from 'react-bootstrap'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { formatTime, parseIsoDate } from '../calendar/calendarDates'
import type { PendingEvent } from '../events/eventsApi'
import { useApproveEvent, useDeleteEvent, usePendingEvents } from '../events/useEventActions'

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
      <h1 className="h3 mb-3">Pending approvals</h1>

      {message && (
        <Alert variant={message.variant} dismissible onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}
      {isError && <Alert variant="danger">Could not load pending events: {error.message}</Alert>}

      {isPending ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status" aria-label="Loading pending events" />
        </div>
      ) : pending.length === 0 ? (
        <p className="text-body-secondary">No events are waiting for approval.</p>
      ) : (
        <Table responsive striped hover className="align-middle">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Title</th>
              <th>Location</th>
              <th>Description</th>
              <th>Submitted by</th>
              <th>Submitted</th>
              <th>
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pending.map((event) => (
              <tr key={event.id}>
                <td className="text-nowrap">{format(parseIsoDate(event.date)!, 'EEE, MMM d, yyyy')}</td>
                <td className="text-nowrap">{formatTime(event.time)}</td>
                <td>{event.title}</td>
                <td>{event.location}</td>
                <td>{event.description}</td>
                <td>{event.creatorName}</td>
                <td className="text-nowrap small">{format(new Date(event.createdAtUtc), 'MMM d, yyyy h:mm a')}</td>
                <td className="text-nowrap text-end">
                  <Button
                    size="sm"
                    variant="success"
                    className="me-2"
                    disabled={isBusy(event.id)}
                    onClick={() => handleApprove(event)}
                    aria-label={`Approve ${event.title}`}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    disabled={isBusy(event.id)}
                    onClick={() => setEventToDelete(event)}
                    aria-label={`Delete ${event.title}`}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

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