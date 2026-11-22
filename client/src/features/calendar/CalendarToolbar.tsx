import { format } from 'date-fns'
import { Button, ButtonGroup } from 'react-bootstrap'
import type { CalendarView } from './calendarDates'

interface CalendarToolbarProps {
  view: CalendarView
  date: Date
  onPrevious: () => void
  onToday: () => void
  onNext: () => void
  onViewChange: (view: CalendarView) => void
}

/** Prev / Today / Next, the current title, and the Month | Day toggle. */
export function CalendarToolbar({ view, date, onPrevious, onToday, onNext, onViewChange }: CalendarToolbarProps) {
  const unit = view === 'month' ? 'month' : 'day'

  return (
    <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
      <ButtonGroup>
        <Button variant="outline-secondary" onClick={onPrevious} aria-label={`Previous ${unit}`}>
          ‹
        </Button>
        <Button variant="outline-secondary" onClick={onToday}>
          Today
        </Button>
        <Button variant="outline-secondary" onClick={onNext} aria-label={`Next ${unit}`}>
          ›
        </Button>
      </ButtonGroup>

      <h1 className="h4 mb-0 mx-2 flex-grow-1">
        {view === 'month' ? format(date, 'MMMM yyyy') : format(date, 'EEEE, MMMM d, yyyy')}
      </h1>

      <ButtonGroup aria-label="Calendar view">
        <Button
          variant={view === 'month' ? 'primary' : 'outline-primary'}
          aria-pressed={view === 'month'}
          onClick={() => onViewChange('month')}
        >
          Month
        </Button>
        <Button
          variant={view === 'day' ? 'primary' : 'outline-primary'}
          aria-pressed={view === 'day'}
          onClick={() => onViewChange('day')}
        >
          Day
        </Button>
      </ButtonGroup>
    </div>
  )
}
