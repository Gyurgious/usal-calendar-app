using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using UsalCalendar.Api.Auth;
using UsalCalendar.Api.Dtos;
using UsalCalendar.Core.Services;

namespace UsalCalendar.Api.Controllers;

[ApiController]
[Route("api/events")]
public sealed class EventsController(EventService eventService) : ControllerBase
{
    // A month grid is at most 6 weeks (42 days); allow a little more, but block huge queries.
    private const int MaxRangeDays = 62;

    /// <summary>Calendar events from `from` to `to` (inclusive), e.g. ?from=2026-11-01&amp;to=2026-12-12.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CalendarEventDto>>> GetCalendar(
        [FromQuery, BindRequired] DateOnly from, [FromQuery, BindRequired] DateOnly to, CancellationToken ct)
    {
        if (to < from)
        {
            ModelState.AddModelError(nameof(to), "'to' must be on or after 'from'.");
            return ValidationProblem();
        }
        if (to.DayNumber - from.DayNumber > MaxRangeDays)
        {
            ModelState.AddModelError(nameof(to), $"Date range cannot be longer than {MaxRangeDays} days.");
            return ValidationProblem();
        }

        var events = await eventService.GetCalendarAsync(from, to, User.GetUserId(), User.IsApprover(), ct);
        return events.Select(CalendarEventDto.FromEntity).ToList();
    }

    // creates an event. Normal users: pending until approved. Approvers: approved immediately
    [HttpPost]
    public async Task<ActionResult<CalendarEventDto>> Create(CreateEventRequest request, CancellationToken ct)
    {
        var created = await eventService.CreateAsync(request.ToDetails(), User.GetUserId(), ct);
        return Created(new Uri($"/api/events/{created.Id}", UriKind.Relative), CalendarEventDto.FromEntity(created));
    }
}
