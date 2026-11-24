namespace UsalCalendar.Core.Models;

/// <summary>The fields an approver fills in for a user (everything except the password).</summary>
public sealed record UserDetails(
    string FirstName,
    string? MiddleName,
    string LastName,
    string LoginName,
    bool IsApprover
);