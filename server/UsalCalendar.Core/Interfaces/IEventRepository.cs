using UsalCalendar.Core.Entities;
using UsalCalendar.Core.Models;

namespace UsalCalendar.Core.Interfaces;

public interface IEventRepository
{
    Task<CalendarEvent?> GetByIdAsync(int id, CancellationToken ct = default);

    Task<IReadOnlyList<CalendarEvent>> GetCalendarAsync(
        DateOnly startDate, DateOnly endDate, int pendingCreatorId, bool includeAllPending,
        CancellationToken ct = default);

        /// <summary>Every event, or only approved/pending ones, with creator and approver, sorted by date then time.</summary>
    Task<IReadOnlyList<CalendarEvent>> GetAllAsync(EventStatus? status, CancellationToken ct = default);
    Task<int> CountApprovedOnDateAsync(DateOnly eventDate, int? excludeEventId = null, CancellationToken ct = default);
    void Add(CalendarEvent calendarEvent);
    void Remove(CalendarEvent calendarEvent);
    Task SaveChangesAsync(CancellationToken ct = default);
}