import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import { LIMITS } from '../../shared/validation/patterns'
import { useAuth } from '../auth/AuthContext'
import type { CalendarEvent } from '../calendar/calendarApi'
import { eventSchema, type EventFormValues } from './eventSchema'
import type { ManagedEvent } from './eventsApi'
import { useCreateEvent } from './useCreateEvent'
import { useUpdateEvent } from './useEventActions'

interface EventFormModalProps {
  /** Give an event to edit it. Leave it out to create a new one. */
  event?: ManagedEvent
  defaultDate?: string
  onClose: () => void
  onSaved: (event: CalendarEvent | ManagedEvent) => void
}

/** "New event" and "Edit event" form. Same fields and rules for both. */
export function EventFormModal({ event, defaultDate = '', onClose, onSaved }: EventFormModalProps) {
  const { user } = useAuth()
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()
  const [serverError, setServerError] = useState<string | null>(null)
  const isApprover = user?.isApprover ?? false

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: event
      ? {
          title: event.title,
          location: event.location ?? '',
          description: event.description ?? '',
          date: event.date,
          time: event.time.slice(0, 5), // "15:30:00" → "15:30"
        }
      : { title: '', location: '', description: '', date: defaultDate, time: '' },
  })

  const onSubmit = async (values: EventFormValues) => {
    setServerError(null)
    const request = {
      ...values,
      location: values.location || null,
      description: values.description || null,
    }
    try {
      const saved = event
        ? await updateEvent.mutateAsync({ id: event.id, request })
        : await createEvent.mutateAsync(request)
      onSaved(saved)
    } catch (error) {
      // e.g. 409 "December 1, 2026 already has 10 approved events. Please choose another day."
      setServerError(error instanceof Error ? error.message : 'Could not save the event.')
    }
  }

  let helpText: string
  if (event) {
    helpText = event.isApproved
      ? 'This event is approved. It can only move to a day with fewer than 10 approved events.'
      : 'This event is still pending. Saving your changes does not approve it.'
  } else {
    helpText = isApprover
      ? 'As an approver, your event is added to the calendar immediately.'
      : 'Your event will be submitted for approval. Until then it appears grayed out on your calendar.'
  }

  const submitLabel = event ? 'Save changes' : isApprover ? 'Add event' : 'Submit for approval'

  return (
    <Modal show onHide={onClose} centered>
      <Form noValidate onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header closeButton>
          <Modal.Title>{event ? 'Edit event' : 'New event'}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <p className="text-body-secondary small">{helpText}</p>

          {serverError && <Alert variant="danger">{serverError}</Alert>}

          <Form.Group className="mb-3" controlId="eventTitle">
            <Form.Label>Title</Form.Label>
            <Form.Control autoFocus isInvalid={!!errors.title} {...register('title')} />
            <Form.Control.Feedback type="invalid">{errors.title?.message}</Form.Control.Feedback>
          </Form.Group>

          <div className="row">
            <Form.Group className="mb-3 col" controlId="eventDate">
              <Form.Label>Date</Form.Label>
              <Form.Control type="date" isInvalid={!!errors.date} {...register('date')} />
              <Form.Control.Feedback type="invalid">{errors.date?.message}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3 col" controlId="eventTime">
              <Form.Label>Time</Form.Label>
              <Form.Control type="time" isInvalid={!!errors.time} {...register('time')} />
              <Form.Control.Feedback type="invalid">{errors.time?.message}</Form.Control.Feedback>
            </Form.Group>
          </div>

          <Form.Group className="mb-3" controlId="eventLocation">
            <Form.Label>
              Location <span className="text-body-secondary">(optional)</span>
            </Form.Label>
            <Form.Control isInvalid={!!errors.location} {...register('location')} />
            <Form.Control.Feedback type="invalid">{errors.location?.message}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group controlId="eventDescription">
            <Form.Label>
              Description <span className="text-body-secondary">(optional)</span>
            </Form.Label>
            <Form.Control as="textarea" rows={3} isInvalid={!!errors.description} {...register('description')} />
            <Form.Text muted>Up to {LIMITS.description} characters.</Form.Text>
            <Form.Control.Feedback type="invalid">{errors.description?.message}</Form.Control.Feedback>
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : submitLabel}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}