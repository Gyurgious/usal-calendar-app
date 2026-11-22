using UsalCalendar.Core.Entities;

namespace UsalCalendar.Api.Dtos;

public sealed record CalendarEventDto(
    int Id,
    string Title,
    string? Location,
    string? Description,
    DateOnly Date,
    TimeOnly Time,
    int CreatorId,
    string CreatorName,
    bool IsApproved)
{
    public static CalendarEventDto FromEntity(CalendarEvent e) => new(
        e.Id, e.Title, e.Location, e.Description, e.Date, e.Time, e.CreatorId, e.Creator.DisplayName, e.IsApproved);
}
