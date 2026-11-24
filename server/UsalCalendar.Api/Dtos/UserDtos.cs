using System.ComponentModel.DataAnnotations;
using UsalCalendar.Core.Entities;
using UsalCalendar.Core.Models;
using UsalCalendar.Core.Rules;

namespace UsalCalendar.Api.Dtos;

/// <summary>A user as approvers see them on the Users page. Never includes the password hash.</summary>
public sealed record UserDto(
    int Id,
    string FirstName,
    string? MiddleName,
    string LastName,
    string LoginName,
    string DisplayName,
    bool IsApprover)
{
    public static UserDto FromEntity(User u) =>
        new(u.Id, u.FirstName, u.MiddleName, u.LastName, u.LoginName, u.DisplayName, u.IsApprover);
}

// Body for creating (POST) and editing (PUT) a user.
public sealed record UserRequest(
    [Required]
    [StringLength(ValidationRules.NameMaxLength)]
    [RegularExpression(ValidationRules.PrintableRegex, ErrorMessage = ValidationMessages.Printable)]
    string FirstName,

    [StringLength(ValidationRules.NameMaxLength)]
    [RegularExpression(ValidationRules.PrintableRegex, ErrorMessage = ValidationMessages.Printable)]
    string? MiddleName,

    [Required]
    [StringLength(ValidationRules.NameMaxLength)]
    [RegularExpression(ValidationRules.PrintableRegex, ErrorMessage = ValidationMessages.Printable)]
    string LastName,

    [Required]
    [RegularExpression(ValidationRules.LoginRegex, ErrorMessage = "Login name must be 4–16 letters or numbers.")]
    string LoginName,

    // An empty value passes [RegularExpression], so "keep the current password" works on edit.
    [RegularExpression(ValidationRules.PasswordRegex,
        ErrorMessage = "Password must be 4–16 letters, numbers or punctuation (no spaces).")]
    string? Password,

    bool IsApprover)
{
    public UserDetails ToDetails() => new(FirstName, MiddleName, LastName, LoginName, IsApprover);
}