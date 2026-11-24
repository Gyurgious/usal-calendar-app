import { useState } from 'react'
import { Alert, Button, Spinner } from 'react-bootstrap'
import { useSearchParams } from 'react-router'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { Icon } from '../../shared/components/Icon'
import { useAuth } from '../auth/AuthContext'
import { EventFormModal } from '../events/EventFormModal'
import type { ManagedEvent } from '../events/eventsApi'
import { useDeleteEvent } from '../events/useEventActions'
import type { CalendarEvent } from './calendarApi'
import { CalendarToolbar } from './CalendarToolbar'
import { getVisibleRange, parseIsoDate, shiftDate, toIsoDate, type CalendarView } from './calendarDates'
import { DayView } from './DayView'
import { MonthView } from './MonthView'
import { useCalendarEvents } from './useCalendarEvents'
import './calendar.css'

type Message = { variant: 'success' | 'danger'; text: string }

/** Removing an event: creators withdraw their own pending submission, approvers delete any event. */
type Removal = { event: CalendarEvent; kind: 'withdraw' | 'delete' }

export function CalendarPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [today] = useState(() => new Date()) // read the clock once, not on every render
  const [message, setMessage] = useState<Message | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [removal, setRemoval] = useState<Removal | null>(null)
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null)
  const remove = useDeleteEvent() // the same DELETE for withdraw and delete; the server checks who may do it
  const view: CalendarView = searchParams.get('view') === 'day' ? 'day' : 'month'
  const date = parseIsoDate(searchParams.get('date')) ?? today

  const { from, to } = getVisibleRange(view, date)
  const { data: events = [], isPending, isError, error } = useCalendarEvents(from, to)

  const show = (nextView: CalendarView, nextDate: Date) =>
    setSearchParams({ view: nextView, date: toIsoDate(nextDate) })

  const handleCreated = (created: CalendarEvent | ManagedEvent) => {
    setIsFormOpen(false)
    setMessage({
      variant: 'success',
      text: created.isApproved
        ? `"${created.title}" was added to the calendar.`
        : `"${created.title}" was submitted for approval. It appears grayed out until an approver approves it.`,
    })
    show(view, parseIsoDate(created.date) ?? date) // jump to the new event's date so the user sees it
  }

  const handleRemove = async ({ event, kind }: Removal) => {
    const done = kind === 'withdraw' ? 'withdrawn' : 'deleted'
    try {
      await remove.mutateAsync(event.id)
      setMessage({ variant: 'success', text: `"${event.title}" was ${done}.` })
    } catch (err) {
      // e.g. 409 on withdraw: an approver approved it a moment ago
      setMessage({ variant: 'danger', text: err instanceof Error ? err.message : `Could not ${kind} the event.` })
    } finally {
      setRemoval(null)
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>School Calendar</h1>
          <p>Keep track of all events through month and day view.</p>
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
        <Alert variant={message.variant} dismissible onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}
      {isError && <Alert variant="danger">Could not load events: {error.message}</Alert>}

      <section className="panel" aria-label="Calendar">
        <CalendarToolbar
          view={view}
          date={date}
          onPrevious={() => show(view, shiftDate(view, date, -1))}
          onToday={() => show(view, new Date())}
          onNext={() => show(view, shiftDate(view, date, 1))}
          onViewChange={(nextView) => show(nextView, date)} // keeps the selected date
        />

        {isPending ? (
          <div className="loading">
            <Spinner animation="border" role="status" aria-label="Loading events" />
          </div>
        ) : view === 'month' ? (
          <MonthView date={date} events={events} onSelectDay={(day) => show('day', day)} />
        ) : (
          <DayView
            events={events}
            currentUserId={user?.id}
            canManage={user?.isApprover ?? false}
            onWithdraw={(event) => setRemoval({ event, kind: 'withdraw' })}
            onEdit={(event) => {
              setMessage(null)
              setEventToEdit(event)
            }}
            onDelete={(event) => setRemoval({ event, kind: 'delete' })}
          />
        )}
      </section>

      {/* Rendered only while open, so every open starts with a fresh, empty form. */}
      {isFormOpen && (
        <EventFormModal defaultDate={toIsoDate(date)} onClose={() => setIsFormOpen(false)} onSaved={handleCreated} />
      )}

      {eventToEdit && (
        <EventFormModal
          event={eventToEdit}
          onClose={() => setEventToEdit(null)}
          onSaved={(saved) => {
            setEventToEdit(null)
            setMessage({ variant: 'success', text: `"${saved.title}" was saved.` })
            show(view, parseIsoDate(saved.date) ?? date) // follow the event if its date changed
          }}
        />
      )}

      {removal?.kind === 'withdraw' && (
        <ConfirmDialog
          title="Withdraw event"
          confirmLabel="Withdraw"
          isWorking={remove.isPending}
          onConfirm={() => handleRemove(removal)}
          onCancel={() => setRemoval(null)}
        >
          Withdraw your submission <strong>{removal.event.title}</strong>? It will be removed and approvers will no
          longer see it.
        </ConfirmDialog>
      )}

      {removal?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete event"
          confirmLabel="Delete"
          isWorking={remove.isPending}
          onConfirm={() => handleRemove(removal)}
          onCancel={() => setRemoval(null)}
        >
          Delete <strong>{removal.event.title}</strong>
          {removal.event.isApproved ? '' : ` submitted by ${removal.event.creatorName}`}? This cannot be undone.
        </ConfirmDialog>
      )}
    </>
  )
}