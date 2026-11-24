import { Button } from 'react-bootstrap'
import { Icon } from '../../shared/components/Icon'
import type { CalendarEvent } from './calendarApi'
import { formatTime } from './calendarDates'

/** Matches the server's rule: at most 10 approved events per day. Pending events don't count. */
const DAILY_LIMIT = 10

interface DayViewProps {
  events: CalendarEvent[]
  currentUserId?: number
  /** Approvers: show Edit and Delete on every event. */
  canManage?: boolean
  onWithdraw?: (event: CalendarEvent) => void
  onEdit?: (event: CalendarEvent) => void
  onDelete?: (event: CalendarEvent) => void
}

/** One day's events with time, title, location, description and creator. */
export function DayView({ events, currentUserId, canManage = false, onWithdraw, onEdit, onDelete }: DayViewProps) {
  const approvedCount = events.filter((event) => event.isApproved).length
  const pendingCount = events.length - approvedCount
  const isFull = approvedCount >= DAILY_LIMIT

  return (
    <div className="day-view">
      {events.length > 0 && (
        // One line instead of a side panel: the toolbar already shows the date.
        <p className="day-summary">
          <span>
            {events.length} {events.length === 1 ? 'event' : 'events'}
            {pendingCount > 0 && ` (${pendingCount} pending)`}
          </span>
          <span className="sep" aria-hidden="true">
            ·
          </span>
          <span>
            {approvedCount} of {DAILY_LIMIT} approved slots used
          </span>
          {isFull && <span className="status pending">Full</span>}
        </p>
      )}

      {events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Icon name="calendar" size={24} />
          </div>
          <h3>No events on this day</h3>
          <p>This day is open. Use New event to add one.</p>
        </div>
      ) : (
        <ul className="day-events">
          {events.map((event) => {
            // Approvers edit and delete any event. Others: only the creator can withdraw, only while pending.
            const canWithdraw = !canManage && !event.isApproved && event.creatorId === currentUserId && onWithdraw

            return (
              <li key={event.id} className={`detail-event${event.isApproved ? '' : ' is-pending'}`}>
                <div className="event-time">
                  <strong>{formatTime(event.time)}</strong>
                </div>
                <div className="event-bar" aria-hidden="true" />
                <div className="event-content">
                  <h3>
                    {event.title}
                    {!event.isApproved && <span className="status pending">Pending</span>}
                  </h3>
                  {event.description && <p>{event.description}</p>}
                  <div className="event-meta">
                    {event.location && (
                      <span>
                        <Icon name="map" size={16} />
                        {event.location}
                      </span>
                    )}
                    <span>
                      <Icon name="user" size={16} />
                      Created by {event.creatorName}
                    </span>
                  </div>
                </div>
                {canManage && (
                  <div className="event-actions">
                    {onEdit && (
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        onClick={() => onEdit(event)}
                        aria-label={`Edit ${event.title}`}
                      >
                        <Icon name="edit" size={15} />
                        Edit
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        size="sm"
                        variant="soft-danger"
                        onClick={() => onDelete(event)}
                        aria-label={`Delete ${event.title}`}
                      >
                        <Icon name="trash" size={15} />
                        Delete
                      </Button>
                    )}
                  </div>
                )}
                {canWithdraw && (
                  <div className="event-actions">
                    <Button
                      size="sm"
                      variant="soft-danger"
                      onClick={() => onWithdraw(event)}
                      aria-label={`Withdraw ${event.title}`}
                    >
                      Withdraw
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
