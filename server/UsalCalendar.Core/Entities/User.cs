using System.Data.Common;

namespace UsalCalendar.Core.Entities;

public class User
{
    // get;set allows other classes to retreive/modify its value
    // In C#, getters and setters can be defined directly inside property declaration
    public int Id { get; set; }
    public required string FirstName { get; set; }
    public string? MiddleName { get; set; }
    public required string LastName { get; set; }
    public required string LoginName { get; set; }
    public required string PasswordHash { get; set; }
    public bool IsApprover { get; set; }

    // expression-bodied property (only has getter)
    public string DisplayName =>
        string.IsNullOrWhiteSpace(MiddleName)
            ? $"{LastName}, {FirstName}"
            : $"{LastName}, {FirstName} {MiddleName}";
}
