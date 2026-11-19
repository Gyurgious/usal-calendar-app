using UsalCalendar.Core.Entities;

namespace UsalCalendar.Core.Interfaces;

public interface IEventRepository
{
    Task<CalendarEvent?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<IReadOnlyList<CalendarEvent>> GetApprovedInRangeAsync(DateOnly startDate, DateOnly endDate,CancellationToken ct = default);
    Task<IReadOnlyList<CalendarEvent>> GetPendingAsync(CancellationToken ct = default);
    Task<int> CountApprovedOnDateAsync(DateOnly eventDate,int? excludeEventId = null, CancellationToken ct = default);
    void Add(CalendarEvent calendarEvent);
    void Remove(CalendarEvent calendarEvent);
    Task SaveChangesAsync(CancellationToken ct = default);

}