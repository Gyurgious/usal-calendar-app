import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import { LIMITS } from '../../shared/validation/patterns'
import { useAuth } from '../auth/AuthContext'
import type { CalendarEvent } from '../calendar/calendarApi'
import { eventSchema, type EventFormValues } from './eventSchema'
import { useCreateEvent } from './useCreateEvent'

interface EventFormModalProps {
  defaultDate: string // "yyyy-MM-dd"
  onClose: () => void
  onCreated: (event: CalendarEvent) => void
}

/** "New event" form. Normal users submit for approval; approvers add directly to the calendar. */
export function EventFormModal({ defaultDate, onClose, onCreated }: EventFormModalProps) {
  const { user } = useAuth()
  const createEvent = useCreateEvent()
  const [serverError, setServerError] = useState<string | null>(null)
  const isApprover = user?.isApprover ?? false

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: { title: '', location: '', description: '', date: defaultDate, time: '' },
  })

  const onSubmit = async (values: EventFormValues) => {
    setServerError(null)
    try {
      const created = await createEvent.mutateAsync({
        ...values,
        location: values.location || null,
        description: values.description || null,
      })
      onCreated(created)
    } catch (error) {
      // e.g. 409 "December 1, 2026 already has 10 approved events. Please choose another day."
      setServerError(error instanceof Error ? error.message : 'Could not save the event.')
    }
  }

  return (
    <Modal show onHide={onClose} centered>
      <Form noValidate onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header closeButton>
          <Modal.Title>New event</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <p className="text-body-secondary small">
            {isApprover
              ? 'As an approver, your event is added to the calendar immediately.'
              : 'Your event will be submitted for approval. Until then it appears grayed out on your calendar.'}
          </p>

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
            {isSubmitting ? 'Saving…' : isApprover ? 'Add event' : 'Submit for approval'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}