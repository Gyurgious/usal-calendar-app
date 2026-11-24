import { format } from 'date-fns'
import { Icon } from '../../shared/components/Icon'
import type { CalendarView } from './calendarDates'

interface CalendarToolbarProps {
  view: CalendarView
  date: Date
  onPrevious: () => void
  onToday: () => void
  onNext: () => void
  onViewChange: (view: CalendarView) => void
}

/** Today / Prev / Next, the current title, and the Month | Day toggle. */
export function CalendarToolbar({ view, date, onPrevious, onToday, onNext, onViewChange }: CalendarToolbarProps) {
  const unit = view === 'month' ? 'month' : 'day'

  return (
    <div className="calendar-toolbar">
      <div className="date-controls">
        <button type="button" className="today" onClick={onToday}>
          Today
        </button>
        <div className="arrows">
          <button type="button" onClick={onPrevious} aria-label={`Previous ${unit}`}>
            ‹
          </button>
          <button type="button" onClick={onNext} aria-label={`Next ${unit}`}>
            ›
          </button>
        </div>
        <h2>{view === 'month' ? format(date, 'MMMM yyyy') : format(date, 'EEEE, MMMM d, yyyy')}</h2>
      </div>

      <div className="view-toggle" role="group" aria-label="Calendar view">
        <button
          type="button"
          className={view === 'month' ? 'selected' : undefined}
          aria-pressed={view === 'month'}
          onClick={() => onViewChange('month')}
        >
          <Icon name="grid" size={15} />
          Month
        </button>
        <button
          type="button"
          className={view === 'day' ? 'selected' : undefined}
          aria-pressed={view === 'day'}
          onClick={() => onViewChange('day')}
        >
          <Icon name="list" size={16} />
          Day
        </button>
      </div>
    </div>
  )
}
