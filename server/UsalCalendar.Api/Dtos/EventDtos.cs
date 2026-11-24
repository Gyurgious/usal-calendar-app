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
        e.Id, e.Title, e.Location, e.Description, e.Date, e.Time, e.CreatorId, UserNames.Of(e.Creator), e.IsApproved);
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
        e.Id, e.Title, e.Location, e.Description, e.Date, e.Time, UserNames.Of(e.Creator), AsUtc(e.CreatedAtUtc));
    internal static DateTime AsUtc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);
}

/// <summary>An event with everything an approver needs: status, creator, approver and both timestamps.</summary>
public sealed record ManagedEventDto(
    int Id,
    string Title,
    string? Location,
    string? Description,
    DateOnly Date,
    TimeOnly Time,
    bool IsApproved,
    string CreatorName,
    DateTime CreatedAtUtc,
    string? ApproverName,
    DateTime? ApprovedAtUtc
    )
{
    public static ManagedEventDto FromEntity(CalendarEvent e) => new(
        e.Id, e.Title, e.Location, e.Description, e.Date, e.Time, e.IsApproved,
        UserNames.Of(e.Creator), UtcDates.AsUtc(e.CreatedAtUtc),
        e.Approver is null ? null : UserNames.Of(e.Approver), 
        e.ApprovedAtUtc is { } approvedAt ? UtcDates.AsUtc(approvedAt) : null);
}

/// <summary>POST /api/events body. Validation rules V4 (location), V5 (title), V6 (description).</summary>
public sealed record EventRequest(
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

// date converter
internal static class UtcDates
{
    public static DateTime AsUtc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);
}

/// <summary>How creator and approver names appear on events (V7), with a marker for deleted users.</summary>
internal static class UserNames
{
    public static string Of(User user) => user.IsActive ? user.DisplayName : $"{user.DisplayName} (deactivated)";
}