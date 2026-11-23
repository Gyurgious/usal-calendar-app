using System.ComponentModel.DataAnnotations;
using UsalCalendar.Core.Entities;
using UsalCalendar.Core.Models;
using UsalCalendar.Core.Rules;

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

/// <summary>One row of the Pending Approvals table (spec 5.5).</summary>
public sealed record PendingEventDto(
    int Id,
    string Title,
    string? Location,
    string? Description,
    DateOnly Date,
    TimeOnly Time,
    string CreatorName,
    DateTime CreatedAtUtc)
{
    public static PendingEventDto FromEntity(CalendarEvent e) => new(
        e.Id, e.Title, e.Location, e.Description, e.Date, e.Time, e.Creator.DisplayName, AsUtc(e.CreatedAtUtc));
    internal static DateTime AsUtc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);
}

/// <summary>POST /api/events body. Validation rules V4 (location), V5 (title), V6 (description).</summary>
public sealed record CreateEventRequest(
    [Required]
    [StringLength(ValidationRules.TitleMaxLength)]
    [RegularExpression(ValidationRules.PrintableRegex, ErrorMessage = ValidationMessages.Printable)]
    string Title,

    [StringLength(ValidationRules.DescriptionMaxLength)]
    [RegularExpression(ValidationRules.PrintableRegex, ErrorMessage = ValidationMessages.Printable)]
    string? Description,

    [StringLength(ValidationRules.LocationMaxLength)]
    [RegularExpression(ValidationRules.PrintableRegex, ErrorMessage = ValidationMessages.Printable)]
    string? Location,

    // Nullable + [Required]: a missing date is a 400, instead of silently becoming 0001-01-01.
    [Required] DateOnly? Date,
    [Required] TimeOnly? Time)
{
    public EventDetails ToDetails() => new(Title, Description, Location, Date!.Value, Time!.Value);
}

/// <summary>Shared validation messages for request DTOs ({0} is replaced with the field name).</summary>
internal static class ValidationMessages
{
    public const string Printable = "{0} can only contain printable characters.";
}