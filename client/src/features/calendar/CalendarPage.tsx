import { useState } from 'react'
import { Alert, Spinner } from 'react-bootstrap'
import { useSearchParams } from 'react-router'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { useAuth } from '../auth/AuthContext'
import { EventFormModal } from '../events/EventFormModal'
import { useDeleteEvent } from '../events/useEventActions'
import type { CalendarEvent } from './calendarApi'
import { CalendarToolbar } from './CalendarToolbar'
import { getVisibleRange, parseIsoDate, shiftDate, toIsoDate, type CalendarView } from './calendarDates'
import { DayView } from './DayView'
import { MonthView } from './MonthView'
import { useCalendarEvents } from './useCalendarEvents'
import type { ManagedEvent } from '../events/eventsApi'

type Message = { variant: 'success' | 'danger'; text: string }

/**
 * Month and Day views. The view and the selected date live in the URL (?view=day&date=2026-11-05),
 * so refresh, Back/Forward and bookmarks all keep your place.
 */
export function CalendarPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [today] = useState(() => new Date()) // read the clock once, not on every render
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [eventToWithdraw, setEventToWithdraw] = useState<CalendarEvent | null>(null)
  const [message, setMessage] = useState<Message | null>(null)
  const withdraw = useDeleteEvent()
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

  const handleWithdraw = async (event: CalendarEvent) => {
    try {
      await withdraw.mutateAsync(event.id)
      setMessage({ variant: 'success', text: `"${event.title}" was withdrawn.` })
    } catch (err) {
      // e.g. 409: an approver approved it a moment ago
      setMessage({ variant: 'danger', text: err instanceof Error ? err.message : 'Could not withdraw the event.' })
    } finally {
      setEventToWithdraw(null)
    }
  }

  return (
    <>
      <CalendarToolbar
        view={view}
        date={date}
        onPrevious={() => show(view, shiftDate(view, date, -1))}
        onToday={() => show(view, new Date())}
        onNext={() => show(view, shiftDate(view, date, 1))}
        onViewChange={(nextView) => show(nextView, date)} // keeps the selected date
        onNewEvent={() => {
          setMessage(null)
          setIsFormOpen(true)
        }}
      />

      {message && (
        <Alert variant={message.variant} dismissible onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}
      {isError && <Alert variant="danger">Could not load events: {error.message}</Alert>}

      {isPending ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status" aria-label="Loading events" />
        </div>
      ) : view === 'month' ? (
        <MonthView date={date} events={events} onSelectDay={(day) => show('day', day)} />
      ) : (
        <DayView events={events} currentUserId={user?.id} onWithdraw={setEventToWithdraw} />
      )}

      {/* Rendered only while open, so every open starts with a fresh, empty form. */}
      {isFormOpen && (
        <EventFormModal
          defaultDate={toIsoDate(date)}
          onClose={() => setIsFormOpen(false)}
          onSaved={handleCreated}
        />
      )}

      {eventToWithdraw && (
        <ConfirmDialog
          title="Withdraw event"
          confirmLabel="Withdraw"
          isWorking={withdraw.isPending}
          onConfirm={() => handleWithdraw(eventToWithdraw)}
          onCancel={() => setEventToWithdraw(null)}
        >
          Withdraw your submission <strong>{eventToWithdraw.title}</strong>? It will be removed and approvers will no
          longer see it.
        </ConfirmDialog>
      )}
    </>
  )
}