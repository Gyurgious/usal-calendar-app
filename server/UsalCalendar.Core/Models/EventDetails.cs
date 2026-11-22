namespace UsalCalendar.Core.Models;

/// <summary>The fields a user fills in for an event. Used for creating now, and for editing later.</summary>
// Can't pass DTO: Core can't reference API because dependency arrow points inward, EventDetails is business input
public sealed record EventDetails(
    string Title, 
    string? Description, string? 
    Location, 
    DateOnly Date, 
    TimeOnly Time
);