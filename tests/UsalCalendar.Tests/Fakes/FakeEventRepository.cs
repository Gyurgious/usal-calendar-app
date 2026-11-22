using UsalCalendar.Core.Entities;
using UsalCalendar.Core.Interfaces;

namespace UsalCalendar.Tests.Fakes;

/// <summary>In-memory IEventRepository. `Events` holds what was "saved".</summary>
internal sealed class FakeEventRepository : IEventRepository
{
    private int _nextId = 1;

    public List<CalendarEvent> Events { get; } = [];

    public int SaveCount { get; private set; }

    public Task<CalendarEvent?> GetByIdAsync(int id, CancellationToken ct = default) =>
        Task.FromResult(Events.FirstOrDefault(e => e.Id == id));

    public Task<IReadOnlyList<CalendarEvent>> GetCalendarAsync(
        DateOnly startDate, DateOnly endDate, int pendingCreatorId, bool includeAllPending,
        CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<CalendarEvent>>(Events
            .Where(e => e.Date >= startDate && e.Date <= endDate)
            .Where(e => e.IsApproved || includeAllPending || e.CreatorId == pendingCreatorId)
            .OrderBy(e => e.Date).ThenBy(e => e.Time)
            .ToList());

    public Task<IReadOnlyList<CalendarEvent>> GetPendingAsync(CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<CalendarEvent>>(Events.Where(e => !e.IsApproved).ToList());

    public Task<int> CountApprovedOnDateAsync(DateOnly eventDate, int? excludeEventId = null, CancellationToken ct = default) =>
        Task.FromResult(Events.Count(e => e.Date == eventDate && e.IsApproved && e.Id != excludeEventId));

    public void Add(CalendarEvent calendarEvent)
    {
        calendarEvent.Id = _nextId++;
        Events.Add(calendarEvent);
    }

    public void Remove(CalendarEvent calendarEvent) => Events.Remove(calendarEvent);

    public Task SaveChangesAsync(CancellationToken ct = default)
    {
        SaveCount++;
        return Task.CompletedTask;
    }
}